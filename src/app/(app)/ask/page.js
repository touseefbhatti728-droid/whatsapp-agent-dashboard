import AskAiChat from "@/components/AskAiChat";

export default function AskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Ask AI</h1>
        <p className="page-sub">For you and your staff: ask about prices, policies, who does what or opening hours — or get a reply drafted for a customer. Answers come from your own services and knowledge.</p>
      </div>
      <AskAiChat />
    </div>
  );
}
