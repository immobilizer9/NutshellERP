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
  ACTIVE:        "badge badge-green",
  INACTIVE:      "badge badge-red",
};

export default function Badge({ status }: { status: string }) {
  return (
    <span className={STYLES[status] ?? "badge badge-gray"}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
