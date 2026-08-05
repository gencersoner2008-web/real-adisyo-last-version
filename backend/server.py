from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal, Dict
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="REAL COFFEE ADİSYON")
api_router = APIRouter(prefix="/api")

# --------- Constants ---------
APP_PASSWORD = os.environ.get("APP_PASSWORD", "1234")
SESSION_TOKEN = "real-coffee-session-token"  # simple, single-user
Category = Literal["hot", "cold", "other"]


# --------- Models ---------
class LoginRequest(BaseModel):
    password: str


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    category: Category
    price_tall: Optional[float] = None
    price_grande: Optional[float] = None
    price_venti: Optional[float] = None
    price: Optional[float] = None  # for cold & other
    # None (missing) = all extras allowed; [] = none; [ids] = restrict to these
    allowed_extra_ids: Optional[List[str]] = None


class Product(ProductCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExtraCreate(BaseModel):
    name: str
    price: float


class Extra(ExtraCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TableCreate(BaseModel):
    name: str


class Table(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TableNoteUpdate(BaseModel):
    note: str = ""


class OrderItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    name: str
    size: Optional[str] = None  # tall/grande/venti/standard
    unit_price: float
    qty: int = 1
    extras: List[dict] = Field(default_factory=list)  # snapshot: [{id,name,price}]

    @property
    def total(self) -> float:
        return round(self.unit_price * self.qty, 2)


class AddItemRequest(BaseModel):
    product_id: str
    size: Optional[str] = None  # required for hot
    qty: int = 1
    extra_ids: List[str] = Field(default_factory=list)


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    table_name: str
    items: List[OrderItem] = Field(default_factory=list)
    status: Literal["open", "paid"] = "open"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    paid_at: Optional[str] = None
    subtotal: float = 0.0
    discount_percent: int = 0
    total: float = 0.0
    source: Literal["staff", "qr"] = "staff"


# --------- Auth ---------
def require_auth(authorization: Optional[str] = Header(None)):
    if not authorization or authorization.replace("Bearer ", "") != SESSION_TOKEN:
        raise HTTPException(status_code=401, detail="Yetkisiz")
    return True


# --------- Realtime pubsub (SSE) ---------
# channel -> list of asyncio.Queue subscribers
_subs: Dict[str, List[asyncio.Queue]] = {}


def _channel_order(table_id: str) -> str:
    return f"order:{table_id}"


def _channel_tables() -> str:
    return "tables:all"


async def _publish(channel: str, event_type: str, data) -> None:
    payload = {"type": event_type, "data": data}
    for q in list(_subs.get(channel, [])):
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass


async def _table_snapshot(table_id: str) -> Optional[dict]:
    order = await get_open_order(table_id)
    t = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not t:
        return None
    return {
        **t,
        "note": t.get("note", ""),
        "has_open_order": bool(order),
        "open_total": order["total"] if order else 0.0,
        "open_item_count": sum(i["qty"] for i in order["items"]) if order else 0,
    }


async def _broadcast_order_change(table_id: str) -> None:
    order = await get_open_order(table_id)
    await _publish(_channel_order(table_id), "order", order)
    snap = await _table_snapshot(table_id)
    if snap is not None:
        await _publish(_channel_tables(), "table", snap)


# --------- Utility ---------
def compute_subtotal(items: List[dict]) -> float:
    return round(sum(i["unit_price"] * i["qty"] for i in items), 2)


async def _get_settings() -> dict:
    doc = await db.settings.find_one({"_id": "app"}) or {}
    return {
        "happy_hour_enabled": bool(doc.get("happy_hour_enabled", False)),
        "happy_hour_percent": int(doc.get("happy_hour_percent", 15)),
    }


async def apply_current_totals(order: dict) -> None:
    settings = await _get_settings()
    pct = settings["happy_hour_percent"] if settings["happy_hour_enabled"] else 0
    order["discount_percent"] = pct
    sub = compute_subtotal(order.get("items", []))
    order["subtotal"] = sub
    order["total"] = round(sub * (1 - pct / 100.0), 2)


async def get_open_order(table_id: str) -> Optional[dict]:
    return await db.orders.find_one({"table_id": table_id, "status": "open"}, {"_id": 0})


# --------- Auth Route ---------
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    if req.password != APP_PASSWORD:
        raise HTTPException(status_code=401, detail="Şifre hatalı")
    return {"token": SESSION_TOKEN}


@api_router.get("/auth/verify")
async def verify(_: bool = Depends(require_auth)):
    return {"ok": True}


# --------- Settings (Happy Hour) ---------
class SettingsUpdate(BaseModel):
    happy_hour_enabled: Optional[bool] = None
    happy_hour_percent: Optional[int] = None


@api_router.get("/settings")
async def get_settings(_: bool = Depends(require_auth)):
    return await _get_settings()


@api_router.put("/settings")
async def update_settings(req: SettingsUpdate, _: bool = Depends(require_auth)):
    update = {}
    if req.happy_hour_enabled is not None:
        update["happy_hour_enabled"] = bool(req.happy_hour_enabled)
    if req.happy_hour_percent is not None:
        update["happy_hour_percent"] = max(0, min(90, int(req.happy_hour_percent)))
    if update:
        await db.settings.update_one({"_id": "app"}, {"$set": update}, upsert=True)
    settings = await _get_settings()
    # Re-apply to all open orders and broadcast to staff clients
    async for o in db.orders.find({"status": "open"}, {"_id": 0}):
        await apply_current_totals(o)
        await db.orders.update_one({"id": o["id"]}, {"$set": {
            "subtotal": o["subtotal"],
            "total": o["total"],
            "discount_percent": o["discount_percent"],
        }})
        await _broadcast_order_change(o["table_id"])
    return settings


# --------- Products ---------
@api_router.get("/products", response_model=List[Product])
async def list_products(_: bool = Depends(require_auth)):
    docs = await db.products.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return docs


@api_router.post("/products", response_model=Product)
async def create_product(p: ProductCreate, _: bool = Depends(require_auth)):
    if p.category == "hot":
        if p.price_tall is None or p.price_grande is None or p.price_venti is None:
            raise HTTPException(400, "Sıcak içecekler için tall/grande/venti fiyatları zorunlu")
    else:
        if p.price is None:
            raise HTTPException(400, "Fiyat zorunlu")
    prod = Product(**p.model_dump())
    await db.products.insert_one(prod.model_dump())
    return prod


@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, p: ProductCreate, _: bool = Depends(require_auth)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Ürün bulunamadı")
    update = p.model_dump()
    await db.products.update_one({"id": product_id}, {"$set": update})
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, _: bool = Depends(require_auth)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Ürün bulunamadı")
    return {"ok": True}


# --------- Extras (Ekstralar) ---------
async def _snapshot_extras(extra_ids: List[str]) -> List[dict]:
    if not extra_ids:
        return []
    found = await db.extras.find({"id": {"$in": extra_ids}}, {"_id": 0}).to_list(100)
    by_id = {e["id"]: e for e in found}
    result = []
    for eid in extra_ids:
        if eid in by_id:
            e = by_id[eid]
            result.append({"id": e["id"], "name": e["name"], "price": float(e["price"])})
    return result


def _extras_sig(extras_list: List[dict]) -> tuple:
    return tuple(sorted([e["id"] for e in (extras_list or [])]))


@api_router.get("/extras", response_model=List[Extra])
async def list_extras(_: bool = Depends(require_auth)):
    docs = await db.extras.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return docs


@api_router.post("/extras", response_model=Extra)
async def create_extra(e: ExtraCreate, _: bool = Depends(require_auth)):
    ex = Extra(**e.model_dump())
    await db.extras.insert_one(ex.model_dump())
    return ex


@api_router.put("/extras/{extra_id}", response_model=Extra)
async def update_extra(extra_id: str, e: ExtraCreate, _: bool = Depends(require_auth)):
    existing = await db.extras.find_one({"id": extra_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Ekstra bulunamadı")
    await db.extras.update_one({"id": extra_id}, {"$set": e.model_dump()})
    doc = await db.extras.find_one({"id": extra_id}, {"_id": 0})
    return doc


@api_router.delete("/extras/{extra_id}")
async def delete_extra(extra_id: str, _: bool = Depends(require_auth)):
    res = await db.extras.delete_one({"id": extra_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Ekstra bulunamadı")
    return {"ok": True}


# --------- Tables ---------
@api_router.get("/tables")
async def list_tables(_: bool = Depends(require_auth)):
    tables = await db.tables.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)
    result = []
    for t in tables:
        order = await get_open_order(t["id"])
        result.append({
            **t,
            "has_open_order": bool(order),
            "open_total": order["total"] if order else 0.0,
            "open_item_count": sum(i["qty"] for i in order["items"]) if order else 0,
        })
    return result


@api_router.post("/tables", response_model=Table)
async def create_table(t: TableCreate, _: bool = Depends(require_auth)):
    tbl = Table(name=t.name)
    await db.tables.insert_one(tbl.model_dump())
    snap = await _table_snapshot(tbl.id)
    if snap:
        await _publish(_channel_tables(), "table", snap)
    return tbl


@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, _: bool = Depends(require_auth)):
    open_order = await get_open_order(table_id)
    if open_order:
        raise HTTPException(400, "Bu masada açık adisyon var, önce ödemeyi kapatın")
    res = await db.tables.delete_one({"id": table_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Masa bulunamadı")
    await _publish(_channel_tables(), "table_deleted", {"id": table_id})
    return {"ok": True}


@api_router.put("/tables/{table_id}/note")
async def update_table_note(table_id: str, req: TableNoteUpdate, _: bool = Depends(require_auth)):
    t = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Masa bulunamadı")
    note = (req.note or "").strip()[:280]
    await db.tables.update_one({"id": table_id}, {"$set": {"note": note}})
    snap = await _table_snapshot(table_id)
    if snap:
        await _publish(_channel_tables(), "table", snap)
    return {"id": table_id, "note": note}


# --------- Orders / Adisyon ---------
@api_router.get("/orders/table/{table_id}")
async def get_table_order(table_id: str, _: bool = Depends(require_auth)):
    order = await get_open_order(table_id)
    return order  # may be None


@api_router.post("/orders/table/{table_id}/add")
async def add_item(table_id: str, req: AddItemRequest, _: bool = Depends(require_auth)):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(404, "Masa bulunamadı")
    product = await db.products.find_one({"id": req.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Ürün bulunamadı")

    # Determine price + size label
    size_label = None
    if product["category"] == "hot":
        if req.size not in ("tall", "grande", "venti"):
            raise HTTPException(400, "Sıcak içecek için boy seçiniz (tall/grande/venti)")
        unit_price = product[f"price_{req.size}"]
        size_label = req.size
    else:
        unit_price = product["price"]
        size_label = "standart" if product["category"] == "cold" else None

    # Extras only allowed for hot drinks; snapshot & add to unit_price
    extras_snap = []
    if req.extra_ids and product["category"] == "hot":
        allowed = product.get("allowed_extra_ids")
        eff_ids = req.extra_ids if allowed is None else [i for i in req.extra_ids if i in allowed]
        extras_snap = await _snapshot_extras(eff_ids)
        unit_price = round(unit_price + sum(e["price"] for e in extras_snap), 2)
    sig = _extras_sig(extras_snap)

    order = await get_open_order(table_id)
    if not order:
        order_obj = Order(table_id=table_id, table_name=table["name"])
        order = order_obj.model_dump()
        await db.orders.insert_one(order)

    # Merge with existing same product+size+extras signature
    merged = False
    for it in order["items"]:
        if (
            it["product_id"] == req.product_id
            and it.get("size") == size_label
            and _extras_sig(it.get("extras", [])) == sig
        ):
            it["qty"] += req.qty
            merged = True
            break
    if not merged:
        item = OrderItem(
            product_id=req.product_id,
            name=product["name"],
            size=size_label,
            unit_price=unit_price,
            qty=req.qty,
            extras=extras_snap,
        )
        order["items"].append(item.model_dump())

    order["total"] = compute_subtotal(order["items"])  # placeholder overridden below
    await apply_current_totals(order)
    await db.orders.update_one({"id": order["id"]}, {"$set": {
        "items": order["items"],
        "subtotal": order["subtotal"],
        "total": order["total"],
        "discount_percent": order["discount_percent"],
    }})
    order = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
    await _broadcast_order_change(table_id)
    return order


@api_router.post("/orders/table/{table_id}/remove/{item_id}")
async def remove_item(table_id: str, item_id: str, _: bool = Depends(require_auth)):
    order = await get_open_order(table_id)
    if not order:
        raise HTTPException(404, "Açık adisyon yok")
    new_items = []
    changed = False
    for it in order["items"]:
        if it["id"] == item_id:
            if it["qty"] > 1:
                it["qty"] -= 1
                new_items.append(it)
            # else drop
            changed = True
        else:
            new_items.append(it)
    if not changed:
        raise HTTPException(404, "Ürün bulunamadı")
    if not new_items:
        await db.orders.delete_one({"id": order["id"]})
        await _broadcast_order_change(table_id)
        return None
    order["items"] = new_items
    await apply_current_totals(order)
    await db.orders.update_one({"id": order["id"]}, {"$set": {
        "items": order["items"],
        "subtotal": order["subtotal"],
        "total": order["total"],
        "discount_percent": order["discount_percent"],
    }})
    order = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
    await _broadcast_order_change(table_id)
    return order


@api_router.post("/orders/table/{table_id}/delete-item/{item_id}")
async def delete_item(table_id: str, item_id: str, _: bool = Depends(require_auth)):
    order = await get_open_order(table_id)
    if not order:
        raise HTTPException(404, "Açık adisyon yok")
    new_items = [it for it in order["items"] if it["id"] != item_id]
    if len(new_items) == len(order["items"]):
        raise HTTPException(404, "Ürün bulunamadı")
    if not new_items:
        await db.orders.delete_one({"id": order["id"]})
        await _broadcast_order_change(table_id)
        return None
    order["items"] = new_items
    await apply_current_totals(order)
    await db.orders.update_one({"id": order["id"]}, {"$set": {
        "items": order["items"],
        "subtotal": order["subtotal"],
        "total": order["total"],
        "discount_percent": order["discount_percent"],
    }})
    order = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
    await _broadcast_order_change(table_id)
    return order


@api_router.post("/orders/table/{table_id}/pay")
async def pay_order(table_id: str, _: bool = Depends(require_auth)):
    order = await get_open_order(table_id)
    if not order:
        raise HTTPException(404, "Açık adisyon yok")
    await apply_current_totals(order)
    paid_at = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "status": "paid",
            "paid_at": paid_at,
            "subtotal": order["subtotal"],
            "total": order["total"],
            "discount_percent": order["discount_percent"],
        }},
    )
    order["status"] = "paid"
    order["paid_at"] = paid_at
    await _broadcast_order_change(table_id)
    return order


# --------- SSE realtime streams ---------
def _sse_check_token(token: str) -> None:
    if token != SESSION_TOKEN:
        raise HTTPException(status_code=401, detail="Yetkisiz")


async def _sse_stream(channel: str, initial_event: Optional[dict], request: Request):
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    _subs.setdefault(channel, []).append(q)

    async def gen():
        try:
            yield ": connected\n\n"
            if initial_event:
                yield f"event: {initial_event['type']}\ndata: {json.dumps(initial_event['data'])}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"event: {ev['type']}\ndata: {json.dumps(ev['data'])}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            try:
                _subs.get(channel, []).remove(q)
            except ValueError:
                pass

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@api_router.get("/orders/stream/{table_id}")
async def stream_order(table_id: str, request: Request, token: str = ""):
    _sse_check_token(token)
    initial = {"type": "order", "data": await get_open_order(table_id)}
    return await _sse_stream(_channel_order(table_id), initial, request)


@api_router.get("/tables/stream")
async def stream_tables(request: Request, token: str = ""):
    _sse_check_token(token)
    # Send initial snapshot of all tables
    tables = await db.tables.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)
    payload = []
    for t in tables:
        snap = await _table_snapshot(t["id"])
        if snap:
            payload.append(snap)
    initial = {"type": "snapshot", "data": payload}
    return await _sse_stream(_channel_tables(), initial, request)


# --------- QR Public Endpoints (customer-facing, no auth) ---------
@api_router.get("/public/menu")
async def public_menu():
    docs = await db.products.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return docs


@api_router.get("/public/extras")
async def public_extras():
    docs = await db.extras.find({}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return docs


@api_router.get("/public/table/{table_id}")
async def public_table(table_id: str):
    t = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Masa bulunamadı")
    return {"id": t["id"], "name": t["name"]}


@api_router.post("/public/orders/table/{table_id}/add")
async def public_add(table_id: str, req: AddItemRequest):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(404, "Masa bulunamadı")
    product = await db.products.find_one({"id": req.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Ürün bulunamadı")
    size_label = None
    if product["category"] == "hot":
        if req.size not in ("tall", "grande", "venti"):
            raise HTTPException(400, "Boy seçiniz")
        unit_price = product[f"price_{req.size}"]
        size_label = req.size
    else:
        unit_price = product["price"]
        size_label = "standart" if product["category"] == "cold" else None

    extras_snap = []
    if req.extra_ids and product["category"] == "hot":
        allowed = product.get("allowed_extra_ids")
        eff_ids = req.extra_ids if allowed is None else [i for i in req.extra_ids if i in allowed]
        extras_snap = await _snapshot_extras(eff_ids)
        unit_price = round(unit_price + sum(e["price"] for e in extras_snap), 2)
    sig = _extras_sig(extras_snap)

    order = await get_open_order(table_id)
    if not order:
        order_obj = Order(table_id=table_id, table_name=table["name"], source="qr")
        order = order_obj.model_dump()
        await db.orders.insert_one(order)

    merged = False
    for it in order["items"]:
        if (
            it["product_id"] == req.product_id
            and it.get("size") == size_label
            and _extras_sig(it.get("extras", [])) == sig
        ):
            it["qty"] += req.qty
            merged = True
            break
    if not merged:
        item = OrderItem(
            product_id=req.product_id,
            name=product["name"],
            size=size_label,
            unit_price=unit_price,
            qty=req.qty,
            extras=extras_snap,
        )
        order["items"].append(item.model_dump())

    await apply_current_totals(order)
    order["source"] = "qr"
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "items": order["items"],
            "subtotal": order["subtotal"],
            "total": order["total"],
            "discount_percent": order["discount_percent"],
            "source": "qr",
        }},
    )
    await _broadcast_order_change(table_id)
    return {"ok": True, "total": order["total"]}


# --------- Reports ---------
def _local_day_bounds(ref: datetime) -> (str, str):
    # Use UTC bounds; simple approach for MVP
    start = ref.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _local_month_bounds(ref: datetime) -> (str, str):
    start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start.isoformat(), end.isoformat()


def _local_year_bounds(ref: datetime) -> (str, str):
    start = ref.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    end = start.replace(year=start.year + 1)
    return start.isoformat(), end.isoformat()


def _period_bounds(period: str):
    now = datetime.now(timezone.utc)
    if period == "yearly":
        return _local_year_bounds(now)
    if period == "monthly":
        return _local_month_bounds(now)
    return _local_day_bounds(now)


@api_router.get("/reports/summary")
async def reports_summary(_: bool = Depends(require_auth)):
    now = datetime.now(timezone.utc)
    d_start, d_end = _local_day_bounds(now)
    m_start, m_end = _local_month_bounds(now)
    y_start, y_end = _local_year_bounds(now)

    async def sum_range(start, end):
        cursor = db.orders.find({
            "status": "paid",
            "paid_at": {"$gte": start, "$lt": end},
        }, {"_id": 0})
        total = 0.0
        count = 0
        async for o in cursor:
            total += o.get("total", 0.0)
            count += 1
        return round(total, 2), count

    daily_total, daily_count = await sum_range(d_start, d_end)
    monthly_total, monthly_count = await sum_range(m_start, m_end)
    yearly_total, yearly_count = await sum_range(y_start, y_end)
    return {
        "daily_total": daily_total,
        "daily_order_count": daily_count,
        "monthly_total": monthly_total,
        "monthly_order_count": monthly_count,
        "yearly_total": yearly_total,
        "yearly_order_count": yearly_count,
    }


@api_router.get("/reports/products")
async def reports_products(period: str = "daily", _: bool = Depends(require_auth)):
    start, end = _period_bounds(period)

    cursor = db.orders.find({
        "status": "paid",
        "paid_at": {"$gte": start, "$lt": end},
    }, {"_id": 0})
    agg = {}
    async for o in cursor:
        for it in o.get("items", []):
            key = (it["name"], it.get("size") or "-")
            if key not in agg:
                agg[key] = {"name": it["name"], "size": it.get("size") or "-", "qty": 0, "revenue": 0.0}
            agg[key]["qty"] += it["qty"]
            agg[key]["revenue"] += it["unit_price"] * it["qty"]
    result = list(agg.values())
    for r in result:
        r["revenue"] = round(r["revenue"], 2)
    result.sort(key=lambda x: -x["qty"])
    return result


@api_router.get("/reports/orders")
async def reports_orders(period: str = "daily", _: bool = Depends(require_auth)):
    start, end = _period_bounds(period)
    docs = await db.orders.find({
        "status": "paid",
        "paid_at": {"$gte": start, "$lt": end},
    }, {"_id": 0}).sort("paid_at", -1).to_list(2000)
    result = []
    for o in docs:
        items_count = sum(i.get("qty", 0) for i in o.get("items", []))
        result.append({
            "id": o["id"],
            "table_name": o.get("table_name", ""),
            "paid_at": o.get("paid_at"),
            "total": o.get("total", 0.0),
            "subtotal": o.get("subtotal", 0.0),
            "discount_percent": o.get("discount_percent", 0),
            "item_count": items_count,
            "items": o.get("items", []),
        })
    return result


@api_router.delete("/reports/orders/{order_id}")
async def delete_paid_order(order_id: str, _: bool = Depends(require_auth)):
    res = await db.orders.delete_one({"id": order_id, "status": "paid"})
    if res.deleted_count == 0:
        raise HTTPException(404, "Sipariş bulunamadı")
    return {"ok": True}


@api_router.delete("/reports/orders")
async def delete_paid_orders_period(period: str = "daily", _: bool = Depends(require_auth)):
    start, end = _period_bounds(period)
    res = await db.orders.delete_many({
        "status": "paid",
        "paid_at": {"$gte": start, "$lt": end},
    })
    return {"deleted": res.deleted_count}


# --------- Seed ---------
@api_router.post("/seed")
async def seed(_: bool = Depends(require_auth)):
    p_count = await db.products.count_documents({})
    t_count = await db.tables.count_documents({})
    if p_count == 0:
        seed_products = [
            {"name": "Espresso", "category": "hot", "price_tall": 55, "price_grande": 65, "price_venti": 75},
            {"name": "Americano", "category": "hot", "price_tall": 60, "price_grande": 70, "price_venti": 80},
            {"name": "Latte", "category": "hot", "price_tall": 70, "price_grande": 80, "price_venti": 90},
            {"name": "Cappuccino", "category": "hot", "price_tall": 70, "price_grande": 80, "price_venti": 90},
            {"name": "Mocha", "category": "hot", "price_tall": 80, "price_grande": 90, "price_venti": 100},
            {"name": "Filtre Kahve", "category": "hot", "price_tall": 55, "price_grande": 65, "price_venti": 75},
            {"name": "Ice Latte", "category": "cold", "price": 85},
            {"name": "Ice Americano", "category": "cold", "price": 75},
            {"name": "Ice Mocha", "category": "cold", "price": 95},
            {"name": "Limonata", "category": "cold", "price": 70},
            {"name": "Cheesecake", "category": "other", "price": 120},
            {"name": "Kek", "category": "other", "price": 80},
            {"name": "Kruvasan", "category": "other", "price": 70},
            {"name": "Su", "category": "other", "price": 20},
        ]
        for sp in seed_products:
            prod = Product(**sp)
            await db.products.insert_one(prod.model_dump())
    if t_count == 0:
        for i in range(1, 9):
            tbl = Table(name=f"Masa {i}")
            await db.tables.insert_one(tbl.model_dump())
    e_count = await db.extras.count_documents({})
    if e_count == 0:
        seed_extras = [
            {"name": "Ekstra Süt", "price": 10},
            {"name": "Ekstra Shot", "price": 15},
            {"name": "Vanilya Şurubu", "price": 8},
            {"name": "Beyaz Çikolata Şurubu", "price": 8},
            {"name": "Karamel Şurubu", "price": 8},
            {"name": "Fındık Şurubu", "price": 8},
            {"name": "Toffee Şurubu", "price": 10},
            {"name": "Bitter Çikolata Şurubu", "price": 8},
        ]
        for se in seed_extras:
            ex = Extra(**se)
            await db.extras.insert_one(ex.model_dump())
    return {"ok": True}


# ---------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
