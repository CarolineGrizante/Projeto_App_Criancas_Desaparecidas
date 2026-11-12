import { Ionicons } from "@expo/vector-icons";
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
  surface: "#141918",
  border: "#29332F",
  text: "#F4F7F4",
  muted: "#8B9690",
  subtle: "#5D6962",
  lime: "#C8FF3D",
  amber: "#F5C86A",
  mint: "#8FD9C5",
};

export function InteractiveMap({ cases, locationLoading, locationError, onRefreshLocation }: InteractiveMapProps) {
  return (
    <View style={styles.wrapper} accessibilityLabel="Mapa demonstrativo; abra no Expo Go para usar o mapa interativo">
      <View style={styles.webMap}>
        <View style={[styles.gridLine, styles.horizontalOne]} />
        <View style={[styles.gridLine, styles.horizontalTwo]} />
        <View style={[styles.gridLine, styles.horizontalThree]} />
        <View style={[styles.gridLine, styles.verticalOne]} />
        <View style={[styles.gridLine, styles.verticalTwo]} />
        <View style={[styles.gridLine, styles.verticalThree]} />
        <View style={styles.road} />
        {cases.slice(0, 5).map((item, index) => (
          <View key={item.id} style={[styles.marker, { left: `${16 + (index * 17) % 70}%`, top: `${23 + (index * 19) % 53}%` }]}>
            <View style={[styles.markerCore, { backgroundColor: item.color }]} />
            <Text style={styles.markerLabel}>{item.distance}</Text>
          </View>
        ))}
        <View style={styles.userMarker}><View style={styles.userMarkerCore} /></View>
        <View style={styles.webBadge}><Ionicons name="phone-portrait-outline" size={14} color={COLORS.lime} /><Text style={styles.webBadgeText}>Mapa interativo no Expo Go</Text></View>
      </View>
      {(locationLoading || locationError) && (
        <View style={styles.locationNotice}>
          <Ionicons name="locate-outline" size={16} color={COLORS.amber} />
          <Text style={styles.locationNoticeText}>{locationLoading ? "A preparar a localização…" : locationError}</Text>
          <Pressable onPress={onRefreshLocation} hitSlop={8} accessibilityLabel="Tentar ativar a localização"><Ionicons name="refresh" size={16} color={COLORS.lime} /></Pressable>
        </View>
      )}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={styles.legendDot} /><Text style={styles.legendText}>Casos demonstrativos</Text></View>
        <View style={styles.legendItem}><View style={styles.legendYouDot} /><Text style={styles.legendText}>Centro do mapa</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: "hidden", borderRadius: 17, backgroundColor: "#18211E" },
  webMap: { height: 240, overflow: "hidden", position: "relative", backgroundColor: "#18211E" },
  gridLine: { position: "absolute", backgroundColor: "#2A3933", opacity: 0.8 },
  horizontalOne: { height: 1, left: -20, right: -20, top: "27%" },
  horizontalTwo: { height: 1, left: -20, right: -20, top: "54%" },
  horizontalThree: { height: 1, left: -20, right: -20, top: "77%" },
  verticalOne: { width: 1, top: -20, bottom: -20, left: "21%" },
  verticalTwo: { width: 1, top: -20, bottom: -20, left: "53%" },
  verticalThree: { width: 1, top: -20, bottom: -20, left: "78%" },
  road: { position: "absolute", height: 7, width: "120%", left: "-9%", top: "52%", backgroundColor: "#23302B", borderWidth: 1, borderColor: "#32423A", transform: [{ rotate: "-21deg" }] },
  marker: { position: "absolute", alignItems: "center", gap: 3 },
  markerCore: { width: 17, height: 17, borderRadius: 17, borderWidth: 4, borderColor: "#C8FF3D88", shadowColor: COLORS.lime, shadowOpacity: 0.8, shadowRadius: 9, elevation: 4 },
  markerLabel: { color: COLORS.text, fontSize: 9, fontWeight: "800", backgroundColor: "#101513CC", paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6 },
  userMarker: { position: "absolute", left: "47%", top: "42%", width: 27, height: 27, borderRadius: 27, borderWidth: 1, borderColor: "#8FD9C588", alignItems: "center", justifyContent: "center" },
  userMarkerCore: { width: 9, height: 9, borderRadius: 9, backgroundColor: COLORS.mint },
  webBadge: { position: "absolute", left: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 99, backgroundColor: "#0F1513DD", paddingHorizontal: 9, paddingVertical: 7 },
  webBadgeText: { color: COLORS.lime, fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  locationNotice: { flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, borderTopColor: "#43552A", backgroundColor: "#121A16", paddingHorizontal: 10, paddingVertical: 8 },
  locationNoticeText: { flex: 1, color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  legend: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, backgroundColor: COLORS.surface },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: COLORS.lime },
  legendYouDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: COLORS.mint },
  legendText: { color: COLORS.subtle, fontSize: 9 },
});
