import { NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION =
  "You are an AI assistant for Nutshell GK Books, a school book distribution and content company based in Siliguri, West Bengal. " +
  "You help with proofreading content documents, fact-checking GK (General Knowledge) content for school students from Class 1 to Class 8, " +
  "suggesting improvements to written content, and answering questions about content creation. " +
  "Be concise, accurate, and helpful. When proofreading, point out specific issues. " +
  "When fact-checking GK content, verify accuracy and suggest corrections if needed.";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI assistant is not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // All messages except the last become history
    const history = messages.slice(0, -1).map((m: { role: string; parts: string }) => ({
      role: m.role as "user" | "model",
      parts: [{ text: m.parts }],
    }));

    // Last message is the one we're sending now
    const lastMessage = messages[messages.length - 1];
    let userText: string = lastMessage.parts;

    // Prepend document context if provided
    if (context) {
      userText = `[Document context:\n${context}\n]\n\n${userText}`;
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userText);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error: any) {
    const msg: string = error?.message ?? "";
    const status: number = error?.status ?? 500;
    console.error("[AI chat] error:", status, msg.slice(0, 200));

    if (status === 429 || msg.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    if (status === 404 || msg.includes("not found")) {
      return NextResponse.json({ error: "AI model unavailable. Contact admin." }, { status: 503 });
    }
    if (status === 403 || msg.includes("API_KEY")) {
      return NextResponse.json({ error: "AI assistant is not configured correctly." }, { status: 503 });
    }

    return NextResponse.json({ error: "AI unavailable. Please try again." }, { status: 500 });
  }
}
