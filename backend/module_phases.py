"""
Praxium Suite — practice-module phase sets (P1 core build).

Static catalog of the ordered PHASE SET each practice-area module walks a
matter through (docs/EXPANSION_ARCHITECTURE.md). PI/MVA (module id
"personal-injury") is the reference implementation and doubles as the
fallback for matters whose module/practice-area is unset or unrecognized.

Gate ids reference gates.GATE_CATALOG (e.g. "demand.send",
"disbursement.approve") where an exact match exists. Where a phase clearly
needs attorney/expert sign-off but no dedicated gate id has been catalogued
yet, "gate" is left None and the description says so explicitly — do not
invent gate ids that aren't registered in gates.py.

Module keys below are the exact `id` values from practice_modules.MODULE_CATALOG.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException

from practice_modules import MODULE_CATALOG, get_module

# ---------------------------------------------------------------------------
# Phase sets
# ---------------------------------------------------------------------------

_PI_REFERENCE: tuple[dict[str, Any], ...] = (
    {"key": "intake", "label": "Intake", "gate": None,
     "description": "Client onboarding, retainer, and initial fact-gathering; matter is opened."},
    {"key": "treatment", "label": "Treatment", "gate": None,
     "description": "Medical treatment is monitored and records/bills are collected through MMI or plateau."},
    {"key": "demand_prep", "label": "Demand preparation", "gate": None,
     "description": "Medical summary and damages workup are assembled and the demand package is drafted for review."},
    {"key": "demand", "label": "Demand", "gate": "demand.send",
     "description": "Attorney-approved demand package is sent to the adverse insurer (gates.GATE_CATALOG: demand.send)."},
    {"key": "negotiation", "label": "Negotiation", "gate": None,
     "description": "Counter-offer rounds run with the adjuster/defense; lien and bill reduction asks run in parallel "
                     "(individual reduction offers/accepts are separately gated — see reduction.offer/reduction.accept)."},
    {"key": "litigation", "label": "Litigation", "gate": None,
     "description": "Suit is filed when negotiation stalls; discovery, motion practice, and trial prep proceed."},
    {"key": "settlement", "label": "Settlement", "gate": None,
     "description": "Settlement is reached and liens/bills are finalized. No dedicated gate id is catalogued for the "
                     "settlement phase itself — the underlying decisions are covered by the reduction.accept and "
                     "disbursement.approve gates."},
    {"key": "disbursement", "label": "Disbursement", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes the client payout (gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after disbursement completes."},
)

_PREMISES_LIABILITY: tuple[dict[str, Any], ...] = (
    {"key": "intake", "label": "Intake", "gate": None,
     "description": "Client onboarding, retainer, and initial fact-gathering; matter is opened."},
    {"key": "evidence_preservation", "label": "Evidence preservation & liability investigation", "gate": None,
     "description": "Owner/occupier and insurer are identified, CCTV/video spoliation letters go out, incident "
                     "report is requested, and (for public-entity defendants) the tort-claim notice deadline is calendared."},
    {"key": "treatment", "label": "Treatment", "gate": None,
     "description": "Medical treatment is monitored and records/bills are collected through MMI or plateau."},
    {"key": "demand_prep", "label": "Demand preparation", "gate": None,
     "description": "Liability file, medical summary, and damages workup are assembled and the demand package is drafted."},
    {"key": "demand", "label": "Demand", "gate": "demand.send",
     "description": "Attorney-approved demand package is sent to the property owner/occupier's insurer (gates.GATE_CATALOG: demand.send)."},
    {"key": "negotiation", "label": "Negotiation", "gate": None,
     "description": "Counter-offer rounds run with the adjuster/defense; lien and bill reduction asks run in parallel."},
    {"key": "litigation", "label": "Litigation", "gate": None,
     "description": "Suit is filed when negotiation stalls; discovery, motion practice, and trial prep proceed."},
    {"key": "settlement", "label": "Settlement", "gate": None,
     "description": "Settlement is reached and liens/bills are finalized; no dedicated gate id for this phase itself."},
    {"key": "disbursement", "label": "Disbursement", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes the client payout (gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after disbursement completes."},
)

_DOG_BITE: tuple[dict[str, Any], ...] = (
    {"key": "intake", "label": "Intake", "gate": None,
     "description": "Client onboarding, retainer, and initial fact-gathering; matter is opened."},
    {"key": "evidence_preservation", "label": "Evidence preservation & liability investigation", "gate": None,
     "description": "Homeowner's/renter's/umbrella coverage is identified, an animal-control report is requested, "
                     "and the wound-photo cadence (day 1/7/30/scar maturity) begins."},
    {"key": "treatment", "label": "Treatment", "gate": None,
     "description": "Medical treatment (and scar/wound-photo documentation) is monitored through MMI or plateau."},
    {"key": "demand_prep", "label": "Demand preparation", "gate": None,
     "description": "Liability file, wound-photo series, medical summary, and damages workup are assembled into a draft demand."},
    {"key": "demand", "label": "Demand", "gate": "demand.send",
     "description": "Attorney-approved demand package is sent to the homeowner's/renter's insurer (gates.GATE_CATALOG: demand.send)."},
    {"key": "negotiation", "label": "Negotiation", "gate": None,
     "description": "Counter-offer rounds run with the adjuster/defense; lien and bill reduction asks run in parallel."},
    {"key": "litigation", "label": "Litigation", "gate": None,
     "description": "Suit is filed when negotiation stalls; discovery, motion practice, and trial prep proceed."},
    {"key": "settlement", "label": "Settlement", "gate": None,
     "description": "Settlement is reached and liens/bills are finalized; no dedicated gate id for this phase itself."},
    {"key": "disbursement", "label": "Disbursement", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes the client payout (gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after disbursement completes."},
)

_MEDICAL_MALPRACTICE: tuple[dict[str, Any], ...] = (
    {"key": "intake", "label": "Intake", "gate": None,
     "description": "Client onboarding, retainer, and initial fact-gathering; matter is opened."},
    {"key": "records_collection", "label": "Records collection", "gate": None,
     "description": "Complete records requests (incl. EHR audit trail) go to every involved provider; "
                     "SOL/repose/pre-suit-notice/affidavit deadlines are calendared."},
    {"key": "merit_review", "label": "Merit review", "gate": None,
     "description": "Case-economics viability screen is run before further spend. Requires attorney sign-off; "
                     "no dedicated gate id is catalogued in gates.GATE_CATALOG yet."},
    {"key": "expert_review", "label": "Expert review", "gate": None,
     "description": "A qualified standard-of-care expert reviews the records and opines on breach and causation. "
                     "Requires attorney sign-off; no dedicated gate id is catalogued in gates.GATE_CATALOG yet."},
    {"key": "affidavit_of_merit", "label": "Affidavit / certificate of merit", "gate": None,
     "description": "Jurisdiction-required affidavit or certificate of merit (where applicable) is prepared and filed "
                     "ahead of or with suit. Requires attorney sign-off; no dedicated gate id is catalogued yet."},
    {"key": "demand_prep", "label": "Demand preparation", "gate": None,
     "description": "Expert opinion, records, and damages workup are assembled into a draft demand or pre-suit package."},
    {"key": "demand", "label": "Demand", "gate": "demand.send",
     "description": "Attorney-approved demand/pre-suit package is sent to the provider's insurer (gates.GATE_CATALOG: demand.send)."},
    {"key": "negotiation", "label": "Negotiation", "gate": None,
     "description": "Counter-offer rounds run with the carrier/defense; lien and bill reduction asks run in parallel."},
    {"key": "litigation", "label": "Litigation", "gate": None,
     "description": "Suit is filed when negotiation stalls; discovery, expert depositions, and trial prep proceed."},
    {"key": "settlement", "label": "Settlement", "gate": None,
     "description": "Settlement is reached and liens/bills are finalized; no dedicated gate id for this phase itself."},
    {"key": "disbursement", "label": "Disbursement", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes the client payout (gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after disbursement completes."},
)

_PRODUCT_LIABILITY: tuple[dict[str, Any], ...] = (
    {"key": "intake", "label": "Intake", "gate": None,
     "description": "Client onboarding, retainer, and initial fact-gathering; matter is opened."},
    {"key": "evidence_preservation", "label": "Product custody & evidence preservation", "gate": None,
     "description": "The product is secured into firm custody within 72 hours with a chain-of-custody log started; "
                     "spoliation letters go to every other party holding it; recall/complaint databases are swept."},
    {"key": "merit_review", "label": "Merit review", "gate": None,
     "description": "Case-economics viability screen is run before further spend. Requires attorney sign-off; "
                     "no dedicated gate id is catalogued in gates.GATE_CATALOG yet."},
    {"key": "expert_review", "label": "Expert review", "gate": None,
     "description": "A qualified defect/causation expert inspects the product and opines on defect theory. "
                     "Requires attorney sign-off; no dedicated gate id is catalogued in gates.GATE_CATALOG yet."},
    {"key": "demand_prep", "label": "Demand preparation", "gate": None,
     "description": "Expert opinion, product file, and damages workup are assembled into a draft demand."},
    {"key": "demand", "label": "Demand", "gate": "demand.send",
     "description": "Attorney-approved demand package is sent to the manufacturer/distributor's insurer (gates.GATE_CATALOG: demand.send)."},
    {"key": "negotiation", "label": "Negotiation", "gate": None,
     "description": "Counter-offer rounds run with the carrier/defense; lien and bill reduction asks run in parallel."},
    {"key": "litigation", "label": "Litigation", "gate": None,
     "description": "Suit is filed when negotiation stalls; discovery, expert depositions, and trial prep proceed."},
    {"key": "settlement", "label": "Settlement", "gate": None,
     "description": "Settlement is reached and liens/bills are finalized; no dedicated gate id for this phase itself."},
    {"key": "disbursement", "label": "Disbursement", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes the client payout (gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after disbursement completes."},
)

_WORKERS_COMPENSATION: tuple[dict[str, Any], ...] = (
    {"key": "report", "label": "Report", "gate": None,
     "description": "Injury reported to employer is verified and the report date is captured."},
    {"key": "comp_claim_filed", "label": "Comp claim filed", "gate": None,
     "description": "The claim is filed with the administrative forum/carrier ahead of the jurisdiction's filing deadline."},
    {"key": "treatment", "label": "Treatment", "gate": None,
     "description": "Authorized medical treatment is monitored; a companion third-party liability case is screened for."},
    {"key": "MMI_rating", "label": "MMI / impairment rating", "gate": None,
     "description": "Claimant reaches maximum medical improvement and an impairment rating is obtained."},
    {"key": "award_or_settlement", "label": "Award or settlement", "gate": None,
     "description": "Benefits are awarded administratively or a compromise/settlement is negotiated. No dedicated "
                     "gate id is catalogued in gates.GATE_CATALOG for the workers'-comp forum yet — attorney "
                     "review is a firm-process control until one is added."},
    {"key": "third_party_coordination", "label": "Third-party coordination", "gate": None,
     "description": "Any companion third-party liability case is coordinated (subrogation/lien exposure tracked back to comp)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived once benefits/settlement and any third-party case resolve."},
)

_MASS_TORT: tuple[dict[str, Any], ...] = (
    {"key": "campaign_qualification", "label": "Campaign qualification", "gate": None,
     "description": "Campaign qualification criteria are confirmed met and documented."},
    {"key": "proof_of_use", "label": "Proof of use", "gate": None,
     "description": "Proof-of-use evidence (pharmacy/purchase/implant records) is collected."},
    {"key": "registry_census", "label": "Registry / census", "gate": None,
     "description": "Claimant is registered/enrolled and census deadlines for the campaign are calendared and met."},
    {"key": "records", "label": "Records", "gate": None,
     "description": "Full medical/product-use record set is collected and organized for the settlement-grid submission."},
    {"key": "settlement_grid", "label": "Settlement grid", "gate": None,
     "description": "Claim is scored and placed on the settlement grid/allocation matrix. No dedicated gate id is "
                     "catalogued in gates.GATE_CATALOG for grid placement yet — attorney review is a firm-process "
                     "control until one is added."},
    {"key": "disbursement", "label": "Disbursement", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes the client payout (gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after disbursement completes."},
)

_NURSING_HOME_ABUSE: tuple[dict[str, Any], ...] = (
    {"key": "intake", "label": "Intake", "gate": None,
     "description": "Client onboarding and initial fact-gathering; if the resident is still at risk, care/safety is "
                     "escalated ahead of case workup."},
    {"key": "authority_verification", "label": "Authority verification", "gate": None,
     "description": "Caller authority (POA / guardianship / next of kin) is verified before records are requested."},
    {"key": "evidence_preservation", "label": "Chart request & liability investigation", "gate": None,
     "description": "Full chart is requested (care plans, MARs, incident reports, staffing) and the admission "
                     "packet is screened for an arbitration clause."},
    {"key": "demand_prep", "label": "Demand preparation", "gate": None,
     "description": "Chart review findings, standard-of-care analysis, and damages workup are assembled into a draft demand."},
    {"key": "demand", "label": "Demand", "gate": "demand.send",
     "description": "Attorney-approved demand package is sent to the facility's insurer (gates.GATE_CATALOG: demand.send)."},
    {"key": "negotiation", "label": "Negotiation", "gate": None,
     "description": "Counter-offer rounds run with the carrier/defense; lien and bill reduction asks run in parallel."},
    {"key": "litigation", "label": "Litigation", "gate": None,
     "description": "Suit or arbitration proceeding is initiated when negotiation stalls (arbitration clause screen "
                     "from the evidence-preservation phase determines the forum)."},
    {"key": "settlement", "label": "Settlement", "gate": None,
     "description": "Settlement/award is reached and liens/bills are finalized; no dedicated gate id for this phase itself."},
    {"key": "disbursement", "label": "Disbursement", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes the client payout (gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after disbursement completes."},
)

_WRONGFUL_DEATH: tuple[dict[str, Any], ...] = (
    {"key": "estate_setup", "label": "Estate setup", "gate": None,
     "description": "Personal-representative appointment is tracked; no claim proceeds without an opened estate/PR."},
    {"key": "investigation", "label": "Investigation", "gate": None,
     "description": "Underlying liability facts are investigated; statutory beneficiaries and relationships are mapped; "
                     "the wrongful-death SOL is calendared separately from any underlying-claim SOL."},
    {"key": "claims", "label": "Claims", "gate": None,
     "description": "Demand/claim package is assembled and sent on behalf of the estate and statutory beneficiaries."},
    {"key": "litigation", "label": "Litigation", "gate": None,
     "description": "Suit is filed when negotiation stalls; discovery, motion practice, and trial prep proceed."},
    {"key": "court_approval", "label": "Court approval", "gate": None,
     "description": "Settlement/verdict proceeds require probate-court approval of the wrongful-death allocation before "
                     "distribution. Requires attorney (and court) sign-off; no dedicated gate id is catalogued in "
                     "gates.GATE_CATALOG yet."},
    {"key": "distribution", "label": "Distribution", "gate": "disbursement.approve",
     "description": "Attorney-approved disbursement sheet authorizes distribution to the estate/beneficiaries "
                     "(gates.GATE_CATALOG: disbursement.approve)."},
    {"key": "closed", "label": "Closed", "gate": None,
     "description": "Matter is closed and archived after distribution completes."},
)

# module id (practice_modules.MODULE_CATALOG "id") -> ordered phase list
MODULE_PHASES: dict[str, list[dict[str, Any]]] = {
    "personal-injury": list(_PI_REFERENCE),
    "premises-liability": list(_PREMISES_LIABILITY),
    "dog-bite": list(_DOG_BITE),
    "workers-compensation": list(_WORKERS_COMPENSATION),
    "medical-malpractice": list(_MEDICAL_MALPRACTICE),
    "product-liability": list(_PRODUCT_LIABILITY),
    "mass-tort": list(_MASS_TORT),
    "nursing-home-abuse": list(_NURSING_HOME_ABUSE),
    "wrongful-death": list(_WRONGFUL_DEATH),
}

DEFAULT_MODULE_KEY = "personal-injury"


def get_phase_set(module_key: Optional[str]) -> list[dict[str, Any]]:
    """Ordered phase list for a module id, falling back to the PI reference set."""
    if module_key and module_key in MODULE_PHASES:
        return MODULE_PHASES[module_key]
    return MODULE_PHASES[DEFAULT_MODULE_KEY]


def _resolve_matter_module_key(matter: dict[str, Any]) -> str:
    """Best-effort resolution of a matter's module key for phase-set lookup.

    Matters carry `module_id` (practice_modules module "id", e.g. "personal-injury")
    once explicitly assigned via PATCH /matters/{id}/module, and always carry a
    `practice_area` (underscored, e.g. "personal_injury") — set by default at
    matter creation and updated alongside module_id on assignment. We prefer
    module_id; if it's missing/unknown we map practice_area back to a module id
    via practice_modules.MODULE_CATALOG; otherwise we fall back to the PI reference.
    """
    module_id = matter.get("module_id")
    if module_id and module_id in MODULE_PHASES:
        return module_id

    practice_area = matter.get("practice_area")
    if practice_area:
        for m in MODULE_CATALOG:
            if m["practice_area"] == practice_area and m["id"] in MODULE_PHASES:
                return m["id"]

    return DEFAULT_MODULE_KEY


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def register_module_phase_routes(
    api,
    db,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable,
    now_iso: Callable,
    log_audit: Callable,
):
    read_guard = require_permission("matters.read", get_current_user)

    @api.get("/practice-modules/phases")
    async def all_module_phases(user=Depends(read_guard)):
        return {"modules": {key: phases for key, phases in MODULE_PHASES.items()}}

    @api.get("/practice-modules/{key}/phases")
    async def module_phases(key: str, user=Depends(read_guard)):
        if key not in MODULE_PHASES:
            raise HTTPException(404, f"Unknown practice module: {key}")
        return {"key": key, "phases": MODULE_PHASES[key]}

    @api.get("/matters/{matter_id}/phase-set")
    async def matter_phase_set(matter_id: str, user=Depends(read_guard)):
        matter = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "module_id": 1, "practice_area": 1},
        )
        if not matter:
            raise HTTPException(404, "Matter not found")
        module_key = _resolve_matter_module_key(matter)
        return {
            "matter_id": matter_id,
            "module_key": module_key,
            "phases": MODULE_PHASES[module_key],
        }
