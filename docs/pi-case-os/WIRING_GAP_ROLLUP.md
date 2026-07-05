# Filevine → Praxium wiring gap rollup

**Generated:** 2026-07-05
**Videos labeled:** 139 · **Functions:** 732

Use with [`UI_UX_GAPS.md`](./UI_UX_GAPS.md) for build priority.

| Praxium tab | Missing | Partial | Total |
|-------------|---------|---------|-------|
| intake | 67 | 46 | 113 |
| medical | 79 | 19 | 98 |
| documents | 66 | 12 | 78 |
| pipeline | 58 | 17 | 75 |
| insurance | 61 | 13 | 74 |
| settlement | 66 | 7 | 73 |
| comms | 54 | 9 | 63 |
| notes | 29 | 2 | 31 |
| demand | 27 | 3 | 30 |
| subrogation | 29 | 1 | 30 |
| /admin/templates | 22 | 3 | 25 |
| tasks | 9 | 8 | 17 |
| /admin/taskflow | 12 | 0 | 12 |
| /feed | 8 | 0 | 8 |
| /reports | 6 | 0 | 6 |
| / | 5 | 1 | 6 |
| reports | 5 | 0 | 5 |
| /matters/new | 0 | 4 | 4 |
| /admin/customs | 3 | 0 | 3 |
| /admin/rbac | 0 | 1 | 1 |
| /admin/knowledge | 1 | 0 | 1 |
| litigation | 1 | 0 | 1 |

---

## intake

- **intake.vital_stats_meds_total** — No vital-stats rollup from meds/PD tabs _(from: 1. the case system -Introduction)_
- **intake.driver_not_passenger_template** — No driver/passenger project type gate _(from: 2017-06-07 Filevine Tutorial (live training))_
- **intake.docgen_from_intake** — No intake-embedded docgen _(from: 3. the case system - Intake Tab)_
- **intake.police_report_request** — Police report intake block missing _(from: 3. the case system - Intake Tab)_
- **customs.advanced.conditional_fields** — No conditional custom field rules _(from: Advanced Customs editor the case system)_
- **customs.editor.open_pi_project_type** — No admin customs/field editor for matter schemas _(from: Customs editor the case system)_

## medical

- **customs.meds.lien_balance_verification_letter** — New customs fields must feed lien balance verification letter _(from: ADVANCED - Customs Editor Meds Field Tab Adding Fields and DocGen (SV))_
- **customs.advanced.meds_tab_fields** — Meds ledger schema is fixed in code _(from: Advanced Customs editor the case system)_
- **settlement.disbursement.print_reduction_proof** — No link from settlement to reduction approval doc _(from: DISBURSEMENT - Tax ID, Return Receipt, DocGen, Scan In, Red. Approval (SP))_
- **docgen.medical.select_bills_for_medpay** — No bill-picker for med pay enclosures _(from: DOCGEN- MED PAY to 1st party)_
- **docgen.medical.lien_holder_context** — No lien-holder entity type separate from provider _(from: DOCGEN - Drop Letter to Lien Holders)_
- **docgen.medical.generate_drop_letter_lien** — No lien-holder drop letter on medical tab _(from: DOCGEN - Drop Letter to Lien Holders)_

## documents

- **docs.dropbox_folder_exact_match** — No Dropbox sync _(from: 7.-DOCS TAB - Dropbox Folder and Naming Docs)_
- **docs.related_case_same_dropbox** — Related matter Dropbox sync missing _(from: 7.-DOCS TAB - Dropbox Folder and Naming Docs)_
- **docs.hashtag_standard_list** — No doc hashtag SSOT _(from: DOCS TAB - Hashtags 2)_
- **docs.filter_by_hashtag** — Doc hashtag filter missing _(from: DOCS TAB - Hashtags 2)_
- **docs.hashtag_on_every_upload** — No required hashtag on upload _(from: DOCS TAB - Hashtags 3)_
- **docs.hashtag_on_upload** — No doc hashtags _(from: DOCS TAB - Hashtags)_

## pipeline

- **feed.intro.filter_and_pin** — No firm feed with pin/filter _(from: 1. the case system -Introduction)_
- **search.global_deeper_archived** — No deep search across archived matters _(from: 1. the case system -Introduction)_
- **taskflow.admin.treatment_phase_selector** — Treatment-phase autotasks not spawned on Praxium phase change _(from: 2017.8.11 FILEVINE - Creating Taskflow and Updating Excel Spreadsheet)_
- **activity.filter_incomplete_batch** — Incomplete filter on matter activity missing _(from: 2. the case system - Activity Feed)_
- **activity.phase_change_auto_tasks** — No phase-driven task templates _(from: 2. the case system - Activity Feed)_
- **customs.advanced.deadlines_reminders** — No deadline/reminder editor _(from: Advanced Customs editor the case system)_

## insurance

- **docgen.matter.verify_medpay_regenerate** — No post-template-update regression test on sample matter _(from: ADVANCED - Customs Editor Meds Field Tab Adding Fields and DocGen (SV))_
- **customs.advanced.insurance_tab_fields** — Insurance tab fields not admin-configurable _(from: Advanced Customs editor the case system)_
- **docgen.insurance.medpay_threshold_rule** — No med-pay request threshold automation _(from: DOCGEN- MED PAY to 1st party)_
- **docgen.insurance.generate_medpay_request** — No first-party med pay letter on insurance tab _(from: DOCGEN- MED PAY to 1st party)_
- **docgen.insurance.medpay_yellow_field_qa** — No yellow-field QA on generated insurance letters _(from: DOCGEN- MED PAY to 1st party)_
- **docgen.insurance.medpay_nitro_attach_bills** — No PDF merge/attach pipeline for med pay outbound _(from: DOCGEN- MED PAY to 1st party)_

## settlement

- **docgen.settlement.regenerate_disbursement_letter** — No disbursement letter docgen on settlement/meds _(from: DISBURSEMENT - Tax ID, Return Receipt, DocGen, Scan In, Red. Approval (SP))_
- **settlement.disbursement.w9_tax_id_lookup** — No W9/tax-ID registry per provider _(from: DISBURSEMENT - Tax ID, Return Receipt, DocGen, Scan In, Red. Approval (SP))_
- **settlement.disbursement.edit_reduction_amount** — Disbursement letter amount not synced from settlement calculator _(from: DISBURSEMENT - Tax ID, Return Receipt, DocGen, Scan In, Red. Approval (SP))_
- **settlement.disbursement.print_return_envelopes** — No envelope print workflow _(from: DISBURSEMENT - Tax ID, Return Receipt, DocGen, Scan In, Red. Approval (SP))_
- **disbursement.queue.review_list** — No firm-wide disbursement queue _(from: FILEVINE - Disbursements)_
- **disbursement.reduction.smiley_face_approved** — No reduction-approved indicator on settlement rows _(from: FILEVINE - Disbursements)_

## comms

- **comms.mailroom.textline_project** — No mailroom with project-scoped SMS + rename _(from: 1. the case system -Introduction)_
- **comms.enable_client_textline** — No per-client Textline enable _(from: 1. the case system -Introduction)_
- **activity.hashtag_glossary** — No activity hashtag index _(from: 2017-06-07 Filevine Tutorial (live training))_
- **activity.colors.green_task_yellow_note** — No activity item type colors _(from: 2. the case system - Activity Feed)_
- **activity.bolded_vine_pin_assign** — Bolded vine + assign missing _(from: 2. the case system - Activity Feed)_
- **activity.share_link_to_client** — No expiring doc share links _(from: 2. the case system - Activity Feed)_

## notes

- **review.assign_with_bold_note** — No bolded-vine formatting in notes _(from: FILEVINE - Case Review)_
- **review.got_it_archive_feed** — No Got It archive on activity items _(from: FILEVINE - Case Review)_
- **feed.activity.filter_by_type** — Activity/notes lack notes/emails/text type filters _(from: FILEVINE - Cleaning your Feed Quickly)_
- **feed.activity.cleaning_workflow_order** — No guided feed-cleaning workflow or saved filter presets _(from: FILEVINE - Cleaning your Feed Quickly)_
- **feed.item.note_vs_task_toggle** — No note/task type toggle on create _(from: FILEVINE - Feed - Going through feed Part 2)_
- **feed.activity.atmention_create_task** — No @mention task spawn _(from: FILEVINE - Feed - Going through feed Part 2)_

## demand

- **docgen.admin.um_uim_demand_dollar_fields** — Demand docgen missing currency formatting in template _(from: ADVANCED - Customs Editor Meds Field Tab Adding Fields and DocGen (SV))_
- **docgen.demand.red_auto_fields** — No demand letter auto-merge from matter fields _(from: DOCGEN - Demand Letter)_
- **docgen.demand.yellow_staff_edits** — No staff-edit vs auto-field distinction in template UI _(from: DOCGEN - Demand Letter)_
- **docgen.demand.totals_validation** — No demand math validation against meds tab _(from: DOCGEN - Demand Letter)_
- **docgen.demand.futures_estimate_policy_limits** — No limits-aware futures estimate helper _(from: DOCGEN - Demand Letter)_
- **docgen.demand.wage_loss_expenses** — Demand builder lacks wage/mileage/expense sections _(from: DOCGEN - Demand Letter)_

## subrogation

- **feed.item.complete_system_task** — No system lien-reduction feed tasks _(from: FILEVINE - Feed - Going through feed Part 3)_
- **subrogation.demand___how_8** — Praxium subrogation lacks Filevine Subrogation parity _(from: DEMAND - How to gather records for a demand)_
- **subrogation.loan_in_liens_tab** — Subrogation tab lacks client litigation-loan tracking _(from: DEMAND PREP - Part 1)_
- **subrogation.subrogation__1** — Praxium subrogation lacks Filevine Subrogation parity _(from: SUBROGATION - Google doc, LOR draft, subro explanation (SP))_
- **health.subrogation__5** — Praxium subrogation lacks Filevine Health parity _(from: SUBROGATION - Google doc, LOR draft, subro explanation (SP))_
- **health.subrogation__2** — Praxium subrogation lacks Filevine Health parity _(from: SUBROGATION LIEN - Rolando Clores)_

