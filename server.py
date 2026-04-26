from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "subtrack")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="SubTrack API", version="1.0.0")
api_router = APIRouter(prefix="/api")
UTC = timezone.utc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Models ───────────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    name: str
    amount: float
    billing_cycle: str  # monthly | yearly
    next_billing_date: str
    category: str
    color: str
    icon: str
    reminder_enabled: bool = True


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    billing_cycle: Optional[str] = None
    next_billing_date: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    reminder_enabled: Optional[bool] = None


class Subscription(BaseModel):
    id: str
    name: str
    amount: float
    billing_cycle: str
    next_billing_date: str
    category: str
    color: str
    icon: str
    reminder_enabled: bool
    created_at: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def clean_doc(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def monthly_amount(sub: dict) -> float:
    if sub["billing_cycle"] == "yearly":
        return sub["amount"] / 12
    return sub["amount"]


# ─── Routes ───────────────────────────────────────────────────────────────────

@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db": str(e)}


@api_router.get("/")
async def root():
    return {"message": "SubTrack API v1"}


@api_router.get("/subscriptions", response_model=List[Subscription])
async def get_subscriptions():
    docs = await db.subscriptions.find().to_list(1000)
    return [clean_doc(doc) for doc in docs]


@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(data: SubscriptionCreate):
    sub = {
        "id": str(uuid.uuid4()),
        **data.dict(),
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.subscriptions.insert_one({**sub})
    return sub


@api_router.get("/subscriptions/{sub_id}", response_model=Subscription)
async def get_subscription(sub_id: str):
    doc = await db.subscriptions.find_one({"id": sub_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return clean_doc(doc)


@api_router.put("/subscriptions/{sub_id}", response_model=Subscription)
async def update_subscription(sub_id: str, data: SubscriptionUpdate):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    result = await db.subscriptions.update_one({"id": sub_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    doc = await db.subscriptions.find_one({"id": sub_id})
    return clean_doc(doc)


@api_router.delete("/subscriptions/{sub_id}")
async def delete_subscription(sub_id: str):
    result = await db.subscriptions.delete_one({"id": sub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Deleted successfully"}


@api_router.get("/analytics")
async def get_analytics():
    docs = await db.subscriptions.find().to_list(1000)
    subs = [clean_doc(doc) for doc in docs]

    monthly_total = sum(monthly_amount(s) for s in subs)

    category_breakdown: dict = {}
    for s in subs:
        cat = s["category"]
        amt = monthly_amount(s)
        category_breakdown[cat] = round(category_breakdown.get(cat, 0) + amt, 2)

    today = datetime.now(UTC).date()
    upcoming = []
    for s in subs:
        try:
            billing_date = datetime.fromisoformat(s["next_billing_date"]).date()
            days_until = (billing_date - today).days
            if 0 <= days_until <= 7:
                upcoming.append({**s, "days_until": days_until})
        except Exception:
            pass

    return {
        "monthly_total": round(monthly_total, 2),
        "yearly_total": round(monthly_total * 12, 2),
        "subscription_count": len(subs),
        "category_breakdown": category_breakdown,
        "upcoming_bills": sorted(upcoming, key=lambda x: x["days_until"]),
    }


@api_router.post("/insights/ai")
async def get_ai_insights():
    """
    Returns rule-based financial insights (no external LLM dependency).
    Safe fallback that works 100% of the time.
    """
    docs = await db.subscriptions.find().to_list(1000)
    subs = [clean_doc(doc) for doc in docs]

    if not subs:
        return {
            "insights": [
                {
                    "type": "info",
                    "title": "Add Subscriptions",
                    "message": "Start by adding your subscriptions to get AI-powered insights.",
                    "icon": "plus-circle",
                }
            ]
        }

    monthly_total = sum(monthly_amount(s) for s in subs)
    category_totals: dict = {}
    for s in subs:
        cat = s["category"]
        category_totals[cat] = category_totals.get(cat, 0) + monthly_amount(s)

    insights = []

    # 1. Highest spending category
    if category_totals:
        top_cat = max(category_totals, key=category_totals.get)
        top_amt = category_totals[top_cat]
        pct = round(top_amt / monthly_total * 100) if monthly_total > 0 else 0
        if pct > 35:
            insights.append({
                "type": "warning",
                "title": f"High {top_cat} Spend",
                "message": f"{top_cat} takes up {pct}% of your budget (₹{round(top_amt)}/month). Consider reviewing those subscriptions.",
                "icon": "alert-triangle",
            })

    # 2. Yearly plan savings tip
    yearly_subs = [s for s in subs if s["billing_cycle"] == "yearly"]
    monthly_subs = [s for s in subs if s["billing_cycle"] == "monthly"]
    if monthly_subs:
        potential_savings = sum(s["amount"] * 0.2 for s in monthly_subs)
        insights.append({
            "type": "tip",
            "title": "Switch to Yearly Plans",
            "message": f"Switching your {len(monthly_subs)} monthly plan(s) to yearly could save you ~₹{round(potential_savings)}/month on average.",
            "icon": "star",
        })
    elif yearly_subs:
        insights.append({
            "type": "tip",
            "title": "Great Use of Yearly Plans",
            "message": f"You have {len(yearly_subs)} yearly subscription(s). You're already saving ~20% compared to monthly billing.",
            "icon": "star",
        })

    # 3. Monthly overview
    insights.append({
        "type": "info",
        "title": "Monthly Overview",
        "message": f"You spend ₹{round(monthly_total)}/month (₹{round(monthly_total * 12)}/year) across {len(subs)} subscriptions.",
        "icon": "info",
    })

    # 4. Audit unused
    if len(subs) >= 4:
        insights.append({
            "type": "saving",
            "title": "Audit Unused Apps",
            "message": "Review subscriptions you haven't used in 30 days. Cancelling even one could save ₹100–500/month.",
            "icon": "trending-down",
        })
    else:
        # Check for duplicate categories
        cat_counts = {}
        for s in subs:
            cat_counts[s["category"]] = cat_counts.get(s["category"], 0) + 1
        dupes = [cat for cat, count in cat_counts.items() if count > 1]
        if dupes:
            insights.append({
                "type": "saving",
                "title": f"Multiple {dupes[0]} Plans",
                "message": f"You have {cat_counts[dupes[0]]} {dupes[0]} subscriptions. Consider consolidating to save money.",
                "icon": "trending-down",
            })
        else:
            insights.append({
                "type": "saving",
                "title": "Keep Tracking",
                "message": "Add more subscriptions to get detailed savings recommendations tailored to your spending.",
                "icon": "trending-down",
            })

    return {"insights": insights[:4]}


@api_router.post("/seed")
async def seed_data():
    count = await db.subscriptions.count_documents({})
    if count > 0:
        return {"message": "Already has data", "seeded": False}

    today = datetime.now(UTC).date()
    sample_subs = [
        {
            "id": str(uuid.uuid4()), "name": "Netflix", "amount": 649,
            "billing_cycle": "monthly",
            "next_billing_date": (today + timedelta(days=3)).isoformat(),
            "category": "Entertainment", "color": "#D94B4B", "icon": "film",
            "reminder_enabled": True, "created_at": datetime.now(UTC).isoformat(),
        },
        {
            "id": str(uuid.uuid4()), "name": "Spotify", "amount": 119,
            "billing_cycle": "monthly",
            "next_billing_date": (today + timedelta(days=12)).isoformat(),
            "category": "Music", "color": "#3E9C74", "icon": "music",
            "reminder_enabled": True, "created_at": datetime.now(UTC).isoformat(),
        },
        {
            "id": str(uuid.uuid4()), "name": "Amazon Prime", "amount": 1499,
            "billing_cycle": "yearly",
            "next_billing_date": (today + timedelta(days=45)).isoformat(),
            "category": "Shopping", "color": "#4A9CD9", "icon": "shopping-bag",
            "reminder_enabled": True, "created_at": datetime.now(UTC).isoformat(),
        },
        {
            "id": str(uuid.uuid4()), "name": "Figma", "amount": 1200,
            "billing_cycle": "monthly",
            "next_billing_date": (today + timedelta(days=6)).isoformat(),
            "category": "Productivity", "color": "#D9654B", "icon": "pen-tool",
            "reminder_enabled": False, "created_at": datetime.now(UTC).isoformat(),
        },
        {
            "id": str(uuid.uuid4()), "name": "YouTube Premium", "amount": 189,
            "billing_cycle": "monthly",
            "next_billing_date": (today + timedelta(days=20)).isoformat(),
            "category": "Entertainment", "color": "#E87A60", "icon": "play",
            "reminder_enabled": True, "created_at": datetime.now(UTC).isoformat(),
        },
        {
            "id": str(uuid.uuid4()), "name": "Notion", "amount": 800,
            "billing_cycle": "monthly",
            "next_billing_date": (today + timedelta(days=18)).isoformat(),
            "category": "Productivity", "color": "#9E9B95", "icon": "file-text",
            "reminder_enabled": True, "created_at": datetime.now(UTC).isoformat(),
        },
    ]

    await db.subscriptions.insert_many(sample_subs)
    return {"message": "Sample data seeded", "seeded": True, "count": len(sample_subs)}


# ─── App setup ────────────────────────────────────────────────────────────────

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
