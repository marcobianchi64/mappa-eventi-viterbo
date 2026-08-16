import L from "leaflet";
import {
  createAtlasMarkerClusterGroupOptions,
  MAP_CLUSTER_MIN_MARKERS,
} from "@atlas/core";

type MarkerClusterProto = {
  _addToMap?: (startPos: unknown) => void;
  __atlasMinClusterPatched?: boolean;
};

let clusterMinSizePatchInstalled = false;

/** Piccoli gruppi (2–7 pin) restano visibili come singoli eventi. */
export function installAtlasClusterMinSizePatch(minSize = MAP_CLUSTER_MIN_MARKERS): void {
  if (clusterMinSizePatchInstalled) return;
  const proto = (L as unknown as { MarkerCluster?: { prototype: MarkerClusterProto } }).MarkerCluster
    ?.prototype;
  if (!proto?._addToMap) return;

  const original = proto._addToMap;
  proto._addToMap = function patchedAddToMap(
    this: {
      _group: {
        _featureGroup: { addLayer: (layer: unknown) => void };
        _map: { getZoom: () => number };
        _getExpandedVisibleBounds: () => L.LatLngBounds;
        options: { atlasMinClusterSize?: number };
      };
      _childCount: number;
      _markers: unknown[];
      _childClusters: Array<{
        _recursivelyAddChildrenToMap: (startPos: unknown, zoom: number, bounds: L.LatLngBounds) => void;
      }>;
    },
    startPos: unknown,
  ) {
    const min = this._group?.options?.atlasMinClusterSize ?? minSize;
    if (this._childCount < min) {
      if (this._childCount === 1 && this._markers[0]) {
        this._group._featureGroup.addLayer(this._markers[0]);
        return;
      }
      for (const marker of this._markers) {
        this._group._featureGroup.addLayer(marker);
      }
      const bounds = this._group._getExpandedVisibleBounds();
      const zoom = this._group._map.getZoom();
      for (const child of this._childClusters) {
        child._recursivelyAddChildrenToMap(startPos, zoom, bounds);
      }
      return;
    }
    return original.call(this, startPos);
  };

  proto.__atlasMinClusterPatched = true;
  clusterMinSizePatchInstalled = true;
}

export function createAtlasMarkerClusterGroup(): L.MarkerClusterGroup {
  installAtlasClusterMinSizePatch();
  return L.markerClusterGroup({
    ...createAtlasMarkerClusterGroupOptions(),
    iconCreateFunction: (cluster: L.MarkerCluster): L.DivIcon => {
      const count = cluster.getChildCount();
      const sizeClass =
        count < 10 ? "atlas-cluster-sm" : count < 100 ? "atlas-cluster-md" : "atlas-cluster-lg";
      return L.divIcon({
        html: `<div class="atlas-cluster ${sizeClass}"><span>${count}</span></div>`,
        className: "",
        iconSize: L.point(36, 36),
      });
    },
  });
}
