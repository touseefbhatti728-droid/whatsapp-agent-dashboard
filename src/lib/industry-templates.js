// Starter content per industry: FAQs for the AI, what to ask leads, an intake form and
// example services. Applying a template only ADDS things — it never deletes the owner's own.
export const INDUSTRIES = {
  salon: {
    label: "Hair & beauty salon",
    leadQuestions: "which service, hair length / current colour, preferred stylist, when they want to come",
    faqs: [
      ["Do you take walk-ins?", "Yes when we have a free chair, but booking is the best way to avoid waiting."],
      ["Cancellation policy", "Please cancel or move your appointment at least 24 hours before. Late cancellations may lose the deposit."],
      ["Late arrival", "If you arrive more than 15 minutes late we may need to shorten or move your appointment."],
      ["Patch test", "Colour services need a patch test at least 48 hours before the first appointment."],
    ],
    intake: [{ label: "Any allergies or sensitive scalp?", type: "text", required: false }, { label: "Have you coloured your hair in the last 3 months?", type: "yesno", required: true }],
    services: [["Women's haircut", 45], ["Blow-dry", 30], ["Full colour", 120], ["Highlights", 150], ["Manicure", 45], ["Pedicure", 60]],
  },
  clinic: {
    label: "Medical / aesthetic / dental clinic",
    leadQuestions: "which treatment, which area or concern, first time or repeat, budget range, when they want to start",
    faqs: [
      ["Consultation", "Every new patient starts with a consultation so the doctor can recommend the right treatment."],
      ["Medical advice", "The assistant can't give medical advice — the doctor will answer medical questions at your consultation."],
      ["Cancellation policy", "Please give at least 24 hours' notice to cancel or move your appointment."],
      ["What to bring", "Please bring your Emirates ID / CNIC and any previous reports or prescriptions."],
    ],
    intake: [
      { label: "Main concern / reason for visit", type: "text", required: true },
      { label: "Any allergies?", type: "text", required: true },
      { label: "Current medication", type: "text", required: false },
      { label: "Are you pregnant or breastfeeding?", type: "choice", options: ["No", "Yes", "Not applicable"], required: true },
    ],
    services: [["Consultation", 30], ["Follow-up visit", 20], ["Teeth cleaning", 45], ["Botox", 30], ["Laser hair removal — small area", 30]],
  },
  gym: {
    label: "Gym / fitness studio",
    leadQuestions: "fitness goal, experience level, preferred times, interest in personal training or classes",
    faqs: [
      ["Free trial", "New members can book a free trial session to see the gym first."],
      ["Membership freeze", "Memberships can be frozen for travel or illness — ask the team for details."],
      ["What to bring", "Comfortable clothes, trainers, a towel and a water bottle."],
    ],
    intake: [{ label: "Fitness goal", type: "choice", options: ["Lose weight", "Build muscle", "General fitness", "Rehab / mobility"], required: true }, { label: "Any injuries or health conditions?", type: "text", required: true }],
    services: [["Free trial session", 60], ["Personal training session", 60], ["Group class", 45], ["Body composition scan", 15]],
  },
  spa: {
    label: "Spa & massage",
    leadQuestions: "which treatment, for how many people, occasion (gift, couple, relax), preferred day",
    faqs: [
      ["Arrival", "Please arrive 10–15 minutes early to relax and fill in a short form."],
      ["Gift vouchers", "Gift vouchers are available — ask us and we'll send one on WhatsApp."],
      ["Cancellation policy", "Please cancel at least 24 hours before your treatment."],
    ],
    intake: [{ label: "Any injuries, pregnancy or medical conditions?", type: "text", required: true }, { label: "Pressure preference", type: "choice", options: ["Light", "Medium", "Firm"], required: false }],
    services: [["Swedish massage 60 min", 60], ["Deep tissue massage 60 min", 60], ["Facial", 60], ["Moroccan bath", 60]],
  },
  real_estate: {
    label: "Real estate agency",
    leadQuestions: "buy or rent, area, budget, bedrooms, move-in date, cash or mortgage",
    faqs: [
      ["Viewings", "We arrange viewings with an agent — tell us the property or area and a time that suits you."],
      ["Documents", "For renting we usually need a passport/ID copy, visa and proof of income."],
      ["Agency fee", "Ask the agent about the agency fee for the property you're interested in."],
    ],
    intake: [{ label: "Buy or rent?", type: "choice", options: ["Buy", "Rent"], required: true }, { label: "Budget", type: "text", required: true }, { label: "Preferred areas", type: "text", required: false }],
    services: [["Property viewing", 30], ["Valuation visit", 45], ["Consultation call", 20]],
  },
  ecommerce: {
    label: "Online store",
    leadQuestions: "which product, size or variant, delivery city, when they need it",
    faqs: [
      ["Delivery", "Tell customers your delivery times and cost here, e.g. 2–3 days in the city."],
      ["Returns", "Write your return / exchange policy here, e.g. within 7 days, unused with tags."],
      ["Order status", "For order status, ask for the order number and the team will check."],
    ],
    intake: [],
    services: [["Personal shopping call", 20], ["Store pickup", 15]],
  },
  education: {
    label: "Academy / tutoring / courses",
    leadQuestions: "student's age or grade, subject or course, online or in person, preferred days, start date",
    faqs: [
      ["Trial class", "New students can book a trial class before enrolling."],
      ["Fees", "Write your fee structure here (monthly / per course)."],
      ["Missed classes", "Missed classes can be made up when a slot is available — ask the team."],
    ],
    intake: [{ label: "Student name and age / grade", type: "text", required: true }, { label: "Subject or course", type: "text", required: true }],
    services: [["Trial class", 45], ["Assessment", 30], ["Admission meeting", 30]],
  },
};
