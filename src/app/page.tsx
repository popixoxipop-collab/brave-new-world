import { GlobeDashboard } from "@/components/GlobeDashboard";
import { loadViinaRenderMeta } from "@/lib/viinaServerData";

export default function Home() {
  const viinaMeta = loadViinaRenderMeta();
  return <GlobeDashboard viinaMeta={viinaMeta} />;
}
