import { ControlTowerPageSkeleton } from "@/features/control-tower/skeleton";

const Loading = (): JSX.Element => {
  return <ControlTowerPageSkeleton withSelector={false} />;
};

export default Loading;
