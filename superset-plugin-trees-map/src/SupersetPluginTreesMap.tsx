import { WebMercatorViewport } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import { default as React, useEffect, useState } from "react";
import StaticMap from "react-map-gl";
import { SupersetPluginTreesMapProps } from "./types";
import { ColorCollection } from "./colors";
import { TreeToltip } from "./components/TreeTooltip";
import { Legend } from "./components/Legend";

export default function SupersetPluginTreesMap(props: SupersetPluginTreesMapProps) {
  const { mapboxApiAccessKey, data, height, width } = props;
  
  const INITIAL_VIEW_STATE = {
    longitude: 13.39883104394256,
    latitude: 52.498574638202776,
    zoom: 13,
    pitch: 0,
    bearing: 0,
  };

  const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);
  const [selectedObject, setSelectedObject] = useState<any>();
  const [hoveredObject, setHoveredObject] = useState<any>();

  useEffect(() => {
    setSelectedObject(undefined);
  }, [viewState]);

  useEffect(() => {
    const lats = data.map((xs) => xs.lat);
    const lons = data.map((xs) => xs.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const { longitude, latitude, zoom } = new WebMercatorViewport(
      viewState
    ).fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { minExtent: 0.05 }
    );

    setViewState({
      ...viewState,
      longitude,
      latitude,
      zoom,
    });
  }, [data]);

  const layers = [
    new ScatterplotLayer({
      id: "scatterplot-layer",
      data: data,
      pickable: true,
      opacity: 1,
      stroked: false,
      filled: true,
      radiusMinPixels: 1,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => [d.lng, d.lat],
      getRadius: (d: any) => {
        return hoveredObject === d.id ? 8 : 6;
      },
      getFillColor: (data: any) => {
        let color = ColorCollection.unknown.color;
        let nowcast = parseInt(data.nowcast_value);
        if (nowcast && nowcast < 33) {
          color = ColorCollection.good.color;
        } else if (nowcast && nowcast < 81) {
          color = ColorCollection.average.color;
        } else {
          color = ColorCollection.critical.color;
        }
        return color;
      },
      onClick: (info: any) => {
        setSelectedObject(info);
      },
      updateTriggers: {
        getLineWidth: [hoveredObject],
        getRadius: [hoveredObject]
      },
    }),
  ];

  const getTooltip = ({ object }: any) => {
    if(object && object.id) {
      setHoveredObject(object.id)
    } else {
      setHoveredObject(undefined)
    }
    return null;
  };

  return (
    <>
      <div style={{ position: "relative", width: width, height: height }}>
        <DeckGL
          initWebGLParameters
          controller
          width={width}
          height={height}
          layers={layers}
          viewState={viewState}
          glOptions={{ preserveDrawingBuffer: true }}
          onViewStateChange={({ viewState }: any) => {
            setViewState(viewState);
          }}
          getTooltip={getTooltip}
        >
          <StaticMap
            preserveDrawingBuffer
            mapboxApiAccessToken={mapboxApiAccessKey}
          />
        </DeckGL>
        <Legend></Legend>
        {selectedObject && (
          <TreeToltip selectedObject={selectedObject} setSelectedObject={setSelectedObject}></TreeToltip>
        )}
      </div>
    </>
  );
}
