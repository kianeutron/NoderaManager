"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateRouteInput, ModuleChanges, RouteChanges, RouteModuleBody } from "@/modules/routes/domain/route.schema";
import { createRoute, createRouteModule, setRouteArchived, setRouteModuleArchived, updateRoute, updateRouteModule } from "@/modules/routes/ui/routes-api";
import { routeKeys } from "@/modules/routes/ui/use-route-queries";

/** The catalog, the overview and everything showing a route's name change with any of these, so they are all refreshed, even after a failure. */
function useInvalidateRoutes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: routeKeys.all });
}

export function useCreateRoute() {
  const invalidate = useInvalidateRoutes();
  return useMutation({ mutationFn: (input: CreateRouteInput) => createRoute(input), onSettled: invalidate });
}

export function useUpdateRoute() {
  const invalidate = useInvalidateRoutes();
  return useMutation({ mutationFn: ({ routeId, changes }: Readonly<{ routeId: string; changes: RouteChanges }>) => updateRoute(routeId, changes), onSettled: invalidate });
}

export function useSetRouteArchived() {
  const invalidate = useInvalidateRoutes();
  return useMutation({ mutationFn: ({ routeId, archive }: Readonly<{ routeId: string; archive: boolean }>) => setRouteArchived(routeId, archive), onSettled: invalidate });
}

export function useCreateRouteModule() {
  const invalidate = useInvalidateRoutes();
  return useMutation({ mutationFn: ({ routeId, input }: Readonly<{ routeId: string; input: RouteModuleBody }>) => createRouteModule(routeId, input), onSettled: invalidate });
}

export function useUpdateRouteModule() {
  const invalidate = useInvalidateRoutes();
  return useMutation({ mutationFn: ({ routeModuleId, changes }: Readonly<{ routeModuleId: string; changes: ModuleChanges }>) => updateRouteModule(routeModuleId, changes), onSettled: invalidate });
}

export function useSetRouteModuleArchived() {
  const invalidate = useInvalidateRoutes();
  return useMutation({ mutationFn: ({ routeModuleId, archive }: Readonly<{ routeModuleId: string; archive: boolean }>) => setRouteModuleArchived(routeModuleId, archive), onSettled: invalidate });
}
