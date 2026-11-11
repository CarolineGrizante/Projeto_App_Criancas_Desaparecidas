import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, type Region } from "react-native-maps";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapCase = {
  id: string;
  title: string;
  distance: string;
  color: string;
  coordinate: MapCoordinate;
};

type InteractiveMapProps = {
  cases: MapCase[];
  userLocation: MapCoordinate;
  locationGranted: boolean;
  locationLoading: boolean;
  locationError?: string;
  selectedCaseId?: string;
  onSelectCase: (id: string) => void;
  onRefreshLocation: () => void;
};

const COLORS = {
  background: "#0B0E0D",
  surface: "#141918",
  border: "#29332F",
  text: "#F4F7F4",
  muted: "#8B9690",
  subtle: "#5D6962",
  lime: "#C8FF3D",
  amber: "#F5C86A",
  mint: "#8FD9C5",
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#18211E" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8B9690" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#18211E" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#34423B" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1B2823" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1B3028" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#26332E" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#34423B" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3B4C43" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#102322" }] },
];

export function InteractiveMap({
  cases,
  userLocation,
  locationGranted,
  locationLoading,
  locationError,
  selectedCaseId,
  onSelectCase,
  onRefreshLocation,
}: InteractiveMapProps) {
  const initialRegion: Region = {
    ...userLocation,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  return (
    <View style={styles.wrapper} accessibilityLabel="Mapa interativo de casos próximos">
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={locationGranted}
        showsMyLocationButton={locationGranted}
        showsCompass
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        loadingEnabled
        loadingBackgroundColor="#18211E"
        loadingIndicatorColor={COLORS.lime}
      >
        {cases.map((item) => {
          const selected = item.id === selectedCaseId;
          return (
            <Marker
              key={item.id}
              coordinate={item.coordinate}
              title={item.title}
              description={`${item.distance} · toque para ver o caso`}
              onPress={() => onSelectCase(item.id)}
              tracksViewChanges={false}
            >
              <View style={[styles.marker, selected && styles.markerSelected]}>
                <View style={[styles.markerCore, { backgroundColor: item.color }]} />
                <Text style={styles.markerLabel}>{item.distance}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.mapOverlay} pointerEvents="none">
        <View style={styles.overlayPill}>
          <View style={[styles.statusDot, { backgroundColor: locationGranted ? COLORS.lime : COLORS.amber }]} />
          <Text style={styles.overlayText}>{locationGranted ? "GPS ATIVO" : "CENTRO DEMONSTRATIVO"}</Text>
        </View>
      </View>

      {(locationLoading || locationError || !locationGranted) && (
        <View style={styles.locationNotice}>
          <Ionicons name={locationGranted ? "checkmark-circle-outline" : "locate-outline"} size={17} color={locationGranted ? COLORS.lime : COLORS.amber} />
          <Text style={styles.locationNoticeText}>
            {locationLoading ? "A atualizar a sua localização…" : locationError ?? "Ative o GPS para centralizar o mapa no seu entorno."}
          </Text>
          {!locationLoading && !locationGranted && (
            <Pressable onPress={onRefreshLocation} hitSlop={8} style={styles.refreshButton} accessibilityLabel="Tentar ativar a localização">
              <Ionicons name="refresh" size={16} color={COLORS.lime} />
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={styles.legendDot} /><Text style={styles.legendText}>Caso ativo</Text></View>
        <View style={styles.legendItem}><View style={styles.legendYouDot} /><Text style={styles.legendText}>Você está aqui</Text></View>
        <Text style={styles.interactionHint}>Arraste e aproxime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: "hidden", borderRadius: 17, backgroundColor: "#18211E" },
  map: { width: "100%", height: 240 },
  mapOverlay: { position: "absolute", left: 11, top: 11 },
  overlayPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 99, backgroundColor: "#0F1513DD", paddingHorizontal: 9, paddingVertical: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 6 },
  overlayText: { color: COLORS.text, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  marker: { alignItems: "center", gap: 3 },
  markerSelected: { transform: [{ scale: 1.12 }] },
  markerCore: { width: 18, height: 18, borderRadius: 18, borderWidth: 4, borderColor: "#C8FF3D88", shadowColor: COLORS.lime, shadowOpacity: 0.75, shadowRadius: 9, elevation: 5 },
  markerLabel: { color: COLORS.text, fontSize: 9, fontWeight: "900", backgroundColor: "#101513EE", paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6 },
  locationNotice: { position: "absolute", left: 10, right: 10, bottom: 42, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "#43552A", borderRadius: 12, backgroundColor: "#121A16EE", paddingHorizontal: 10, paddingVertical: 8 },
  locationNoticeText: { flex: 1, color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  refreshButton: { padding: 2 },
  legend: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, backgroundColor: COLORS.surface },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: COLORS.lime },
  legendYouDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: COLORS.mint },
  legendText: { color: COLORS.subtle, fontSize: 9 },
  interactionHint: { flex: 1, color: COLORS.subtle, fontSize: 9, textAlign: "right" },
});
