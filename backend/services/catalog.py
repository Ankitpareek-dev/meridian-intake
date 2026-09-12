# Official Service Catalog for Meridian Tax & Advisory

SERVICE_CATALOG = [
    {
        "id": "individual_tax_prep",
        "name": "Individual Tax Preparation",
        "description": "Annual personal income tax filing, including multi-state and prior-year corrections.",
        "search_context": (
            "Annual personal income tax filing, including multi-state and prior-year corrections. "
            "Form 1040, personal W-2, 1099 personal income, deductions, state personal returns, "
            "individual taxpayer filings, personal tax amendments."
        ),
    },
    {
        "id": "business_tax_prep",
        "name": "Business Tax Preparation",
        "description": "Annual filing for LLCs, S-corps, and partnerships, including quarterly estimated payments.",
        "search_context": (
            "Annual filing for LLCs, S-corps, and partnerships, including quarterly estimated payments. "
            "Small business tax returns, Form 1065, Form 1120-S, quarterly tax filings, "
            "schedule C, company tax compliance, LLC tax filings."
        ),
    },
    {
        "id": "bookkeeping_monthly_close",
        "name": "Bookkeeping & Monthly Close",
        "description": "Ongoing transaction categorization, reconciliation, and monthly financial statements.",
        "search_context": (
            "Ongoing transaction categorization, reconciliation, and monthly financial statements. "
            "Monthly financial reports, profit and loss P&L, balance sheet, reconciling bank accounts, "
            "monthly books, bookkeeping for online store or small business, checking monthly profitability."
        ),
    },
    {
        "id": "advisory_fractional_cfo",
        "name": "Advisory & Fractional CFO",
        "description": "Cash flow planning, budgeting, and strategic financial guidance for growing businesses.",
        "search_context": (
            "Cash flow planning, budgeting, and strategic financial guidance for growing businesses. "
            "Fractional CFO services, running company finance strategy, forecasting, profitability analysis, "
            "strategic guidance, financial direction, business scaling advice."
        ),
    },
    {
        "id": "payroll_services",
        "name": "Payroll Services",
        "description": "Payroll processing, tax withholding, and compliance filings for businesses with employees.",
        "search_context": (
            "Payroll processing, tax withholding, and compliance filings for businesses with employees. "
            "Paying workers, running payroll, employee direct deposits, payroll taxes, "
            "W-2 withholdings, staff pay compliance."
        ),
    },
    {
        "id": "entity_formation_compliance",
        "name": "Entity Formation & Compliance",
        "description": "New business formation, registered agent services, and annual state compliance filings.",
        "search_context": (
            "New business formation, registered agent services, and annual state compliance filings. "
            "Forming an LLC, incorporating S-Corp, register business entity, articles of organization, "
            "annual state franchise filings."
        ),
    },
    {
        "id": "audit_support",
        "name": "Audit Support",
        "description": "Representation and documentation support during an IRS or state tax authority audit.",
        "search_context": (
            "Representation and documentation support during an IRS or state tax authority audit. "
            "IRS audit notice, state tax authority investigation, audit defense, tax controversy representation, "
            "IRS correspondence review."
        ),
    },
    {
        "id": "retirement_estate_planning",
        "name": "Retirement & Estate Planning",
        "description": "Retirement account strategy, estate tax planning, and succession planning for business owners.",
        "search_context": (
            "Retirement account strategy, estate tax planning, and succession planning for business owners. "
            "Inheritance, inherited property and accounts, deceased parent estate, estate taxes, "
            "Form 706, wealth transfer, trusts and estates, succession."
        ),
    },
]

def get_service_catalog():
    return SERVICE_CATALOG

def get_service_by_id(service_id: str):
    for service in SERVICE_CATALOG:
        if service["id"] == service_id:
            return service
    return None
