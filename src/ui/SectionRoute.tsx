import { useRouter } from "expo-router";
import { Button } from "./Button";
import { Card } from "./Card";
import { ShellFrame, StatusPanel } from "./Shell";
import { spacing } from "../theme/spacing";

export function SectionRoute({
  title,
  subtitle,
  statusTitle,
  statusMessage,
  action,
}: {
  title: string;
  subtitle: string;
  statusTitle: string;
  statusMessage: string;
  action: { label: string; route: string };
}) {
  const router = useRouter();

  return (
    <ShellFrame title={title} subtitle={subtitle}>
      <Card style={{ padding: spacing.md, gap: spacing.md }}>
        <StatusPanel kind="info" title={statusTitle} message={statusMessage} />
        <Button
          fullWidth
          variant="secondary"
          onPress={() => router.push(action.route as never)}
        >
          {action.label}
        </Button>
      </Card>
    </ShellFrame>
  );
}
