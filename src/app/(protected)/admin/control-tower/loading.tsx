import { ControlTowerRouteLoading } from "@/features/control-tower/skeleton/route-loading";

// In the shape of the view the URL opens (route-loading.tsx).
const Loading = (): JSX.Element => {
  return <ControlTowerRouteLoading withSelector={true} />;
};

export default Loading;
