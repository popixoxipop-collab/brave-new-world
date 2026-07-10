import { GlobeBootLoader } from "@/components/GlobeBootLoader";
import { loadViinaRenderMeta } from "@/lib/viinaServerData";

export default function Home() {
  const viinaMeta = loadViinaRenderMeta();
  return <GlobeBootLoader viinaMeta={viinaMeta} />;
}
