const STYLES: Record<string, string> = {
  PENDING:       "badge badge-yellow",
  APPROVED:      "badge badge-green",
  REJECTED:      "badge badge-red",
  COMPLETED:     "badge badge-green",
  LEAD:          "badge badge-gray",
  CONTACTED:     "badge badge-blue",
  VISITED:       "badge badge-indigo",
  PROPOSAL_SENT: "badge badge-yellow",
  NEGOTIATION:   "badge badge-yellow",
  CLOSED_WON:    "badge badge-green",
  CLOSED_LOST:   "badge badge-red",
  ORIGINAL:      "badge badge-gray",
  ADDITIONAL:    "badge badge-blue",
  ACTIVE:           "badge badge-green",
  INACTIVE:         "badge badge-red",
  // Payment
  UNPAID:           "badge badge-red",
  PARTIAL:          "badge badge-yellow",
  PAID:             "badge badge-green",
  // Delivery
  DISPATCHED:       "badge badge-blue",
  DELIVERED:        "badge badge-green",
  // Visit outcomes
  INTERESTED:       "badge badge-green",
  FOLLOW_UP:        "badge badge-yellow",
  NOT_INTERESTED:   "badge badge-red",
  ORDER_PLACED:     "badge badge-green",
  // Task priority
  LOW:              "badge badge-gray",
  MEDIUM:           "badge badge-yellow",
  HIGH:             "badge badge-red",
};

export default function Badge({ status }: { status: string }) {
  return (
    <span className={STYLES[status] ?? "badge badge-gray"}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
