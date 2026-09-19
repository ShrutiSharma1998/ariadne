"""Generates public/sample/sam-rivera-resume.pdf, the fictional resume visitors can use to try Ariadne.

Every name, employer and number is invented. Requires: pip install reportlab
Run from the project root: python scripts/make_sample_resume.py
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate

OUT = Path(__file__).resolve().parent.parent / "public" / "sample" / "sam-rivera-resume.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

ink = colors.HexColor("#2B2620")
muted = colors.HexColor("#5E554A")

name = ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=ink)
sub = ParagraphStyle("sub", fontName="Helvetica", fontSize=9.5, leading=13, textColor=muted)
h = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=ink, spaceBefore=10)
role = ParagraphStyle("role", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=ink, spaceBefore=6)
body = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13.5, textColor=ink)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=12, bulletIndent=2)

doc = SimpleDocTemplate(
    str(OUT),
    pagesize=letter,
    leftMargin=0.8 * inch,
    rightMargin=0.8 * inch,
    topMargin=0.7 * inch,
    bottomMargin=0.7 * inch,
    title="Sam Rivera - Sample resume (fictional)",
    author="Ariadne sample data",
)

s = []
s.append(Paragraph("Sam Rivera", name))
s.append(Paragraph("Fictional sample resume for trying Ariadne. Every name, employer and number is invented.", sub))
s.append(Paragraph("sam.rivera@example.com  |  Larkfield", sub))
s.append(HRFlowable(width="100%", thickness=0.8, color=muted, spaceBefore=6, spaceAfter=2))

s.append(Paragraph("Summary", h))
s.append(
    Paragraph(
        "Marketer turned product manager. I combine customer research and small experiments to improve onboarding "
        "and activation, and I mentor others who are changing careers.",
        body,
    )
)

s.append(Paragraph("Experience", h))


def bullets(items):
    for t in items:
        s.append(Paragraph(t, bullet, bulletText="•"))


s.append(Paragraph("Associate Product Manager, Brightpath Health &nbsp;&nbsp;|&nbsp;&nbsp; Apr 2023 - present", role))
bullets(
    [
        "Own onboarding for a wellness app used by 80,000 people.",
        "Mapped where new users dropped off, ran five small experiments, and worked with design and engineering to ship a redesign.",
        "Lifted activation by 18% in one quarter.",
    ]
)

s.append(Paragraph("Marketing Manager, Fernway Outdoor Co. &nbsp;&nbsp;|&nbsp;&nbsp; Sep 2021 - Mar 2023", role))
bullets(
    [
        "Led a brand refresh and managed a team of three.",
        "Interviewed 25 customers, wrote the new positioning, and ran weekly check-ins with the team.",
        "Launched on schedule; repeat purchases rose 12% the following quarter.",
    ]
)

s.append(Paragraph("Marketing Coordinator, Fernway Outdoor Co. &nbsp;&nbsp;|&nbsp;&nbsp; Jul 2019 - Aug 2021", role))
bullets(
    [
        "Ran the email programme and weekly reporting for an outdoor gear retailer.",
        "Segmented the customer list, ran A/B tests on subject lines, and built a one-page weekly dashboard.",
        "Raised email open rates from 21% to 34%; the dashboard became the team's Monday meeting.",
    ]
)

s.append(Paragraph("Projects and side ventures", h))
s.append(Paragraph("Habit tracker built with no-code tools &nbsp;&nbsp;|&nbsp;&nbsp; Feb 2022 - Sep 2022", role))
bullets(
    [
        "Built and launched a simple habit-tracking app for friends. Held weekly calls with early users. "
        "300 sign-ups and 40 weekly active users after six months."
    ]
)
s.append(Paragraph("Hand-printed tote bag shop &nbsp;&nbsp;|&nbsp;&nbsp; Mar 2018 - Jun 2019", role))
bullets(
    [
        "Designed, printed and sold tote bags online. Tested three price points and learned product photography. "
        "About $6,400 in revenue and a repeat-customer rate near 25%."
    ]
)

s.append(Paragraph("Volunteering and community", h))
s.append(Paragraph("Mentor for career changers, local meetup &nbsp;&nbsp;|&nbsp;&nbsp; Jan 2024 - present", role))
bullets(
    [
        "Give monthly one-to-one advice to people moving into product. "
        "Mentored 14 people; three have since moved into product roles."
    ]
)
s.append(Paragraph("Volunteer scheduler, Eastside Food Bank &nbsp;&nbsp;|&nbsp;&nbsp; Jun 2017 - Aug 2019", role))
bullets(["Replaced a paper sign-up sheet with a shared spreadsheet and reminder texts. Cut no-shows by about 30%."])
s.append(Paragraph("Host, weekly campus podcast, Larkfield Campus Radio &nbsp;&nbsp;|&nbsp;&nbsp; Jan 2016 - Dec 2018", role))
bullets(
    [
        "Created and hosted a weekly interview show about student startups. "
        "Grew to 1,200 weekly listeners and 60 episodes."
    ]
)

s.append(Paragraph("Education and certifications", h))
s.append(Paragraph("B.A. Communications (minor in statistics), Larkfield State University &nbsp;|&nbsp; 2015 - 2019", body))
s.append(Paragraph("Product management certificate, part-time evening programme &nbsp;|&nbsp; Jan 2023 - Jun 2023", body))
s.append(Paragraph("Google Analytics certification &nbsp;|&nbsp; Oct 2020", body))

s.append(Paragraph("Other", h))
s.append(Paragraph("Ran a first half marathon in April 2025, finishing in 2 hours 8 minutes.", body))

doc.build(s)
print("wrote", OUT)
