from fastapi import APIRouter, Depends, Query, status

from app.auth import require_role
from app.database import get_db
from app.routes.organizations import get_my_organization_doc
from app.schemas import DonationCreate, DonationDecision
from app.utils.gamification import award_points, calculate_donation_points, check_and_award_badges
from app.utils.helpers import bad_request, clean_doc, forbidden, not_found, now, to_object_id
from app.utils.notify import create_notification

router = APIRouter(prefix="/donations", tags=["Donations"])


def donation_to_dict(db, donation: dict) -> dict:
    data = clean_doc(donation)
    org = db.organizations.find_one({"_id": donation["organization_id"]})
    donor = db.users.find_one({"_id": donation["donor_id"]})
    data["organization_name"] = org["name"] if org else ""
    data["donor_name"] = donor["name"] if donor else ""
    return data


@router.post("", status_code=status.HTTP_201_CREATED)
def create_donation(data: DonationCreate, user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    org = db.organizations.find_one({"_id": to_object_id(data.organization_id, "Organization")})
    if org is None:
        raise not_found("Organization")

    donation = {
        "donor_id": user["_id"],
        "organization_id": org["_id"],
        "type": data.type,
        "amount": data.amount,
        "quantity": data.quantity,
        "description": data.description.strip(),
        "status": "pending",
        "points_awarded": 0,
        "created_at": now(),
    }
    donation["_id"] = db.donations.insert_one(donation).inserted_id

    create_notification(
        db, org["user_id"], "donation", "New donation to confirm",
        f'{user["name"]} recorded a {data.type} donation. Please verify it when received.',
        link="/app/donations",
    )
    return donation_to_dict(db, donation)


@router.get("/me")
def my_donations(user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    donations = db.donations.find({"donor_id": user["_id"]}).sort("created_at", -1)
    return [donation_to_dict(db, d) for d in donations]


@router.get("/received")
def received_donations(
    status_filter: str = Query(default="", alias="status", pattern="^(|pending|verified|rejected)$"),
    user: dict = Depends(require_role("organization")),
):
    db = get_db()
    org = get_my_organization_doc(db, user)
    query = {"organization_id": org["_id"]}
    if status_filter:
        query["status"] = status_filter
    return [donation_to_dict(db, d) for d in db.donations.find(query).sort("created_at", -1)]


@router.patch("/{donation_id}")
def decide_donation(
    donation_id: str,
    data: DonationDecision,
    user: dict = Depends(require_role("organization", "admin")),
):
    """The receiving organization (or an admin) verifies or rejects a donation."""
    db = get_db()
    donation = db.donations.find_one({"_id": to_object_id(donation_id, "Donation")})
    if donation is None:
        raise not_found("Donation")

    if user["role"] == "organization":
        org = get_my_organization_doc(db, user)
        if donation["organization_id"] != org["_id"]:
            raise forbidden("Only the receiving organization can verify this donation.")

    # Only a pending donation can change. This also stops double point awards.
    changed = db.donations.update_one(
        {"_id": donation["_id"], "status": "pending"},
        {"$set": {"status": data.status, "decision_note": data.note.strip(), "decided_at": now(), "decided_by": user["_id"]}},
    )
    if changed.modified_count == 0:
        raise bad_request("This donation was already verified or rejected.")

    if data.status == "verified":
        points = calculate_donation_points(donation)
        award_points(
            db, donation["donor_id"], points, "donation",
            f'Verified {donation["type"]} donation',
            source_key=f"donation:{donation['_id']}",
            organization_id=donation["organization_id"],
        )
        db.donations.update_one({"_id": donation["_id"]}, {"$set": {"points_awarded": points}})
        check_and_award_badges(db, donation["donor_id"])
        create_notification(
            db, donation["donor_id"], "donation", "Donation verified",
            "Thank you! Your donation was confirmed by the organization.", link="/app/donations",
        )
    else:
        create_notification(
            db, donation["donor_id"], "donation", "Donation not confirmed",
            data.note.strip() or "The organization could not confirm this donation.",
            link="/app/donations",
        )

    return donation_to_dict(db, db.donations.find_one({"_id": donation["_id"]}))
