import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

// GET /api/analytics/competitors
// Aggregates competitor intelligence across all schools.
// Groups by competitor name, shows schools using them, conversion rate.
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "ANALYTICS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Scope: BD sees team schools, Admin sees all
    let schoolWhere: any = { deletedAt: null };
    if (hasModule(decoded, "TEAM_MANAGEMENT") && !hasModule(decoded, "USER_MANAGEMENT")) {
      const team = await prisma.user.findMany({
        where:  { managerId: decoded.userId },
        select: { id: true },
      });
      schoolWhere.assignedToId = { in: [decoded.userId, ...team.map((u) => u.id)] };
    }

    // Get all competitor notes with their school's order data
    const competitorNotes = await prisma.competitorNote.findMany({
      where:   { school: schoolWhere, isActive: true },
      include: {
        school: {
          select: {
            id: true, name: true, city: true, state: true,
            orders: {
              where:  { status: "APPROVED", deletedAt: null },
              select: { id: true, netAmount: true },
            },
          },
        },
      },
    });

    // Group by competitor name
    const byCompetitor: Record<string, {
      competitor:   string;
      schools:      Set<string>;
      schoolNames:  string[];
      cities:       Set<string>;
      converted:    Set<string>; // school IDs with approved orders
      totalRevenue: number;
    }> = {};

    for (const note of competitorNotes) {
      const name = note.competitor.trim();
      if (!byCompetitor[name]) {
        byCompetitor[name] = { competitor: name, schools: new Set(), schoolNames: [], cities: new Set(), converted: new Set(), totalRevenue: 0 };
      }
      const entry = byCompetitor[name];
      if (!entry.schools.has(note.schoolId)) {
        entry.schools.add(note.schoolId);
        entry.schoolNames.push(note.school.name);
        entry.cities.add(note.school.city);
        if (note.school.orders.length > 0) {
          entry.converted.add(note.schoolId);
          entry.totalRevenue += note.school.orders.reduce((s, o) => s + o.netAmount, 0);
        }
      }
    }

    const competitors = Object.values(byCompetitor)
      .map((c) => ({
        competitor:      c.competitor,
        schoolCount:     c.schools.size,
        convertedCount:  c.converted.size,
        conversionRate:  c.schools.size > 0 ? Math.round((c.converted.size / c.schools.size) * 100) : 0,
        revenueWon:      Math.round(c.totalRevenue),
        cities:          [...c.cities].slice(0, 5),
        topSchools:      c.schoolNames.slice(0, 5),
      }))
      .sort((a, b) => b.schoolCount - a.schoolCount);

    // City × competitor matrix (top 8 cities)
    const cityMap: Record<string, Record<string, number>> = {};
    for (const note of competitorNotes) {
      const city = note.school.city;
      const comp = note.competitor.trim();
      if (!cityMap[city]) cityMap[city] = {};
      cityMap[city][comp] = (cityMap[city][comp] || 0) + 1;
    }

    const topCities = Object.entries(cityMap)
      .sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0))
      .slice(0, 8)
      .map(([city, comps]) => ({ city, ...comps, total: Object.values(comps).reduce((s, v) => s + v, 0) }));

    const topCompetitorNames = competitors.slice(0, 5).map((c) => c.competitor);

    return NextResponse.json({
      competitors,
      topCities,
      topCompetitorNames,
      totalCompetitorNotes: competitorNotes.length,
      schoolsWithCompetitors: new Set(competitorNotes.map((n) => n.schoolId)).size,
    });
  } catch (err) {
    console.error("Competitor analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
