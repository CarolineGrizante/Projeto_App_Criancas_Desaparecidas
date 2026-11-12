import { Accelerometer, Gyroscope } from "expo-sensors";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { InteractiveMap, type MapCase, type MapCoordinate } from "@/components/interactive-map";
import * as GuardiaoAuth from "@/lib/guardiao-auth";
import { formatGuardiaoProfileDate } from "@/lib/guardiao-profile-date";

type Screen = "login" | "signup" | "verify" | "forgot" | "gov" | "feed" | "wizard" | "sensors" | "case_detail" | "profile";
type Radius = 5 | 15 | 50;
type WizardStep = 1 | 2 | 3;
type NoticeType = "success" | "error" | "info";

type Notice = {
  type: NoticeType;
  message: string;
};

const FALLBACK_COORDINATE: MapCoordinate = { latitude: -23.5505, longitude: -46.6333 };

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: "default" | "email-address" | "numeric";
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

const COLORS = {
  background: "#0B0E0D",
  surface: "#141918",
  surfaceRaised: "#1A201E",
  border: "#29332F",
  text: "#F4F7F4",
  muted: "#8B9690",
  subtle: "#5D6962",
  lime: "#C8FF3D",
  limeDark: "#A7D52B",
  coral: "#FF8578",
  amber: "#F5C86A",
};

const DEMO_CODE = "246810";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.brand, compact && styles.brandCompact]}>
      <View style={styles.brandIcon}>
        <Ionicons name="shield-checkmark-outline" size={compact ? 20 : 23} color={COLORS.lime} />
      </View>
      <View>
        <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>guardião</Text>
        {!compact && <Text style={styles.brandCaption}>apoio com responsabilidade</Text>}
      </View>
    </View>
  );
}

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={styles.progressRow} accessibilityLabel={`Etapa ${step} de 3`}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={[styles.progressDot, item <= step && styles.progressDotActive]} />
      ))}
      <Text style={styles.progressLabel}>ETAPA {step} DE 3</Text>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  icon,
  keyboardType = "default",
  secureTextEntry = false,
  onToggleSecure,
  error,
  autoCapitalize = "none",
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputShellError]}>
        <Ionicons name={icon} size={18} color={error ? COLORS.coral : COLORS.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.subtle}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectionColor={COLORS.lime}
          style={styles.input}
        />
        {onToggleSecure && (
          <Pressable onPress={onToggleSecure} hitSlop={10} accessibilityLabel="Mostrar ou ocultar palavra-passe">
            <Ionicons name={secureTextEntry ? "eye-outline" : "eye-off-outline"} size={18} color={COLORS.muted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const icon = notice.type === "success" ? "checkmark-circle-outline" : notice.type === "error" ? "alert-circle-outline" : "information-circle-outline";
  const color = notice.type === "success" ? COLORS.lime : notice.type === "error" ? COLORS.coral : COLORS.amber;
  return (
    <View style={[styles.notice, { borderColor: `${color}55`, backgroundColor: `${color}10` }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.noticeText, { color }]}>{notice.message}</Text>
    </View>
  );
}

function PrimaryButton({
  children,
  onPress,
  loading = false,
  disabled = false,
  icon,
}: {
  children: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.primaryButton, (pressed || disabled) && styles.primaryButtonPressed]}
    >
      {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryButtonText}>{children}</Text>}
      {!loading && icon && <Ionicons name={icon} size={18} color={COLORS.background} />}
    </Pressable>
  );
}

function BackButton({ onPress, label = "Voltar" }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} style={styles.backButton} hitSlop={8}>
      <Ionicons name="arrow-back" size={18} color={COLORS.text} />
      <Text style={styles.backButtonText}>{label}</Text>
    </Pressable>
  );
}

function ScreenFrame({ children, onBack, backLabel }: { children: ReactNode; onBack?: () => void; backLabel?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.page, { paddingTop: Math.max(insets.top * 0.18, 8) }]}>
        <View style={styles.topBar}>
          {onBack ? <BackButton onPress={onBack} label={backLabel} /> : <BrandMark compact />}
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>PROTÓTIPO</Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function LoginScreen({ onNavigate, onLogin, externalError }: {
  onNavigate: (screen: Screen) => void;
  onLogin: () => void;
  externalError?: string | null;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice | undefined>();
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleLogin = async () => {
    setIdentifierError("");
    setPasswordError("");
    setNotice(undefined);
    let valid = true;
    if (!identifier.trim() || !identifier.includes("@")) {
      setIdentifierError("Informe o e-mail cadastrado. O CPF ainda não está habilitado.");
      valid = false;
    }
    if (!password.trim()) {
      setPasswordError("Informe a sua palavra-passe.");
      valid = false;
    }
    if (!valid) return;
    setLoading(true);
    try {
      await GuardiaoAuth.loginAccount(identifier.trim(), password);
      onLogin();
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Falha ao entrar." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenFrame>
      <View style={styles.loginIntro}>
        <View style={styles.signalLine}>
          <View style={styles.signalLineFill} />
        </View>
        <Text style={styles.eyebrow}>ENTRAR COM SEGURANÇA</Text>
        <Text style={styles.title}>Informação certa, no momento certo.</Text>
        <Text style={styles.subtitle}>Entre para ajudar com responsabilidade e manter a sua comunidade protegida.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardKicker}>ACESSO À SUA CONTA</Text>
        <Text style={styles.cardTitle}>Vamos começar</Text>
        <Text style={styles.cardDescription}>Use os seus dados para aceder ao protótipo do Guardião.</Text>

        <Field
          label="E-MAIL"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Digite o e-mail cadastrado"
          icon="person-outline"
          keyboardType="email-address"
          error={identifierError}
        />
        <Field
          label="PALAVRA-PASSE"
          value={password}
          onChangeText={setPassword}
          placeholder="Digite a sua palavra-passe"
          icon="lock-closed-outline"
          secureTextEntry={!showPassword}
          onToggleSecure={() => setShowPassword((value) => !value)}
          error={passwordError}
        />

        <Pressable onPress={() => onNavigate("forgot")} style={styles.forgotLink}>
          <Text style={styles.linkText}>Esqueci-me da palavra-passe</Text>
          <Ionicons name="arrow-up-right-box" size={15} color={COLORS.lime} />
        </Pressable>

        {(notice || externalError) && <NoticeBanner notice={notice ?? {
          type: /^(Palavra-passe atualizada|E-mail atualizado)/.test(externalError ?? "") ? "success" : "error",
          message: externalError!,
        }} />}
        <PrimaryButton onPress={handleLogin} loading={loading} icon="arrow-forward">
          Entrar na minha conta
        </PrimaryButton>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.divider} />
        </View>

        <Pressable onPress={() => onNavigate("gov")} style={styles.govButton}>
          <View style={styles.govBadge}><Text style={styles.govBadgeText}>G</Text></View>
          <View style={styles.govCopy}>
            <Text style={styles.govTitle}>Entrar com Gov.br</Text>
            <Text style={styles.govSubtitle}>Opção didática, sem integração real</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={COLORS.muted} />
        </Pressable>
      </View>

      <View style={styles.createRow}>
        <Text style={styles.mutedText}>Ainda não tem uma conta?</Text>
        <Pressable onPress={() => onNavigate("signup")}>
          <Text style={styles.linkText}>Criar conta</Text>
        </Pressable>
      </View>

      <View style={styles.privacyNote}>
        <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.subtle} />
        <Text style={styles.privacyText}>Os seus dados são tratados com cuidado e respeito.</Text>
      </View>
    </ScreenFrame>
  );
}

function BottomNav({ active, onNavigate }: { active: "feed" | "wizard" | "sensors"; onNavigate: (screen: Screen) => void }) {
  return (
    <View style={styles.bottomNav}>
      <Pressable onPress={() => onNavigate("feed")} style={[styles.navItem, active === "feed" && styles.navItemActive]}>
        <Ionicons name="map-outline" size={20} color={active === "feed" ? COLORS.lime : COLORS.muted} />
        <Text style={[styles.navLabel, active === "feed" && styles.navLabelActive]}>Alertas</Text>
      </Pressable>
      <Pressable onPress={() => onNavigate("wizard")} style={[styles.navItem, active === "wizard" && styles.navItemActive]}>
        <Ionicons name="add-circle-outline" size={20} color={active === "wizard" ? COLORS.lime : COLORS.muted} />
        <Text style={[styles.navLabel, active === "wizard" && styles.navLabelActive]}>Notificar</Text>
      </Pressable>
      <Pressable onPress={() => onNavigate("sensors")} style={[styles.navItem, active === "sensors" && styles.navItemActive]}>
        <Ionicons name="hardware-chip-outline" size={20} color={active === "sensors" ? COLORS.lime : COLORS.muted} />
        <Text style={[styles.navLabel, active === "sensors" && styles.navLabelActive]}>Sensores</Text>
      </Pressable>
      <Pressable onPress={() => onNavigate("login")} style={styles.navItem}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.muted} />
        <Text style={styles.navLabel}>Sair</Text>
      </Pressable>
    </View>
  );
}

type DemoAlert = MapCase & {
  age: string;
  neighborhood: string;
  distanceValue: number;
  time: string;
  status: string;
  category: string;
};

function destinationPoint(origin: MapCoordinate, distanceKm: number, bearingDegrees: number): MapCoordinate {
  const earthRadiusKm = 6371;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const latitude = (origin.latitude * Math.PI) / 180;
  const longitude = (origin.longitude * Math.PI) / 180;
  const angularDistance = distanceKm / earthRadiusKm;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLongitude = longitude + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
  );
  return {
    latitude: (nextLatitude * 180) / Math.PI,
    longitude: (nextLongitude * 180) / Math.PI,
  };
}

function buildDemoAlerts(origin: MapCoordinate): DemoAlert[] {
  const definitions = [
    { id: "aurora", title: "Caso Aurora", age: "8 anos", neighborhood: "Centro", distanceValue: 3, bearing: 35, time: "Atualizado há 18 min", status: "Em triagem", category: "Alerta recente", color: "#C8FF3D" },
    { id: "miguel", title: "Caso Miguel", age: "11 anos", neighborhood: "Vila Mariana", distanceValue: 4.8, bearing: 145, time: "Atualizado há 42 min", status: "Em triagem", category: "Busca comunitária", color: "#F5C86A" },
    { id: "theo", title: "Caso Theo", age: "6 anos", neighborhood: "Moema", distanceValue: 7.2, bearing: 265, time: "Atualizado há 1 h", status: "Em verificação", category: "Alerta recente", color: "#8FD9C5" },
    { id: "helena", title: "Caso Helena", age: "13 anos", neighborhood: "Aclimação", distanceValue: 12, bearing: 315, time: "Atualizado há 1 h", status: "Em triagem", category: "Apoio solicitado", color: "#D9A7FF" },
    { id: "ravi", title: "Caso Ravi", age: "4 anos", neighborhood: "Ipiranga", distanceValue: 18, bearing: 205, time: "Atualizado há 2 h", status: "Em verificação", category: "Alerta recente", color: "#FF9D78" },
    { id: "sofia", title: "Caso Sofia", age: "10 anos", neighborhood: "Pinheiros", distanceValue: 34, bearing: 80, time: "Atualizado há 3 h", status: "Em triagem", category: "Busca comunitária", color: "#91B7FF" },
  ];
  return definitions.map((item) => ({
    ...item,
    distance: `${String(item.distanceValue).replace(".", ",")} km`,
    coordinate: destinationPoint(origin, item.distanceValue, item.bearing),
  }));
}

function MapPanel({
  cases,
  userLocation,
  locationGranted,
  locationLoading,
  locationError,
  selectedCaseId,
  onSelectCase,
  onRefreshLocation,
}: {
  cases: DemoAlert[];
  userLocation: MapCoordinate;
  locationGranted: boolean;
  locationLoading: boolean;
  locationError?: string;
  selectedCaseId?: string;
  onSelectCase: (id: string) => void;
  onRefreshLocation: () => void;
}) {
  const selected = cases.find((item) => item.id === selectedCaseId);
  return (
    <View style={styles.mapCard}>
      <View style={styles.mapCardHeader}>
        <View>
          <Text style={styles.cardKicker}>MAPA DE PROXIMIDADE</Text>
          <Text style={styles.mapTitle}>Atenção no seu entorno</Text>
        </View>
        <View style={styles.gpsPill}>
          <View style={[styles.gpsDot, !locationGranted && styles.gpsDotWarning]} />
          <Text style={[styles.gpsPillText, !locationGranted && styles.gpsPillTextWarning]}>{locationGranted ? "GPS ATIVO" : "CENTRO DEMO"}</Text>
        </View>
      </View>
      <InteractiveMap
        cases={cases}
        userLocation={userLocation}
        locationGranted={locationGranted}
        locationLoading={locationLoading}
        locationError={locationError}
        selectedCaseId={selectedCaseId}
        onSelectCase={onSelectCase}
        onRefreshLocation={onRefreshLocation}
      />
      {selected && (
        <View style={styles.selectedCaseRow}>
          <View style={[styles.selectedCaseDot, { backgroundColor: selected.color }]} />
          <View style={styles.selectedCaseCopy}>
            <Text style={styles.selectedCaseTitle}>{selected.title} · {selected.distance}</Text>
            <Text style={styles.selectedCaseText}>{selected.category} · toque nos marcadores para trocar</Text>
          </View>
          <Ionicons name="information-circle-outline" size={17} color={COLORS.subtle} />
        </View>
      )}
    </View>
  );
}

function AlertCard({ title, age, neighborhood, distance, time, color, status, category, onPress }: { title: string; age: string; neighborhood: string; distance: string; time: string; color: string; status: string; category: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.alertCard} accessibilityRole="button" accessibilityLabel={`${title}, ${distance}`}>
      <View style={[styles.alertAvatar, { backgroundColor: color }]}>
        <Ionicons name="person-outline" size={22} color={COLORS.background} />
      </View>
      <View style={styles.alertCopy}>
        <View style={styles.alertTitleRow}>
          <Text style={styles.alertTitle}>{title}</Text>
          <View style={styles.alertDistance}><Ionicons name="navigate-outline" size={12} color={COLORS.lime} /><Text style={styles.alertDistanceText}>{distance}</Text></View>
        </View>
        <Text style={styles.alertMeta}>{age} · {neighborhood}</Text>
        <Text style={styles.alertCategory}>{category}</Text>
        <View style={styles.alertFooter}><Ionicons name="time-outline" size={13} color={COLORS.subtle} /><Text style={styles.alertFooterText}>{time}</Text><View style={styles.alertStatus}><View style={styles.alertStatusDot} /><Text style={styles.alertStatusText}>{status}</Text></View></View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={COLORS.subtle} />
    </Pressable>
  );
}

function FeedScreen({ onNavigate }: { onNavigate: (screen: Screen, caseData?: DemoAlert) => void }) {
  const [radius, setRadius] = useState<Radius>(5);
  const [userLocation, setUserLocation] = useState<MapCoordinate>(FALLBACK_COORDINATE);
  const [locationPermission, setLocationPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | undefined>();
  const [selectedCaseId, setSelectedCaseId] = useState("aurora");

  const requestLocation = useCallback(async () => {
    if (Platform.OS === "web") {
      setLocationPermission("denied");
      setLocationLoading(false);
      setLocationError("Abra no Expo Go para usar o GPS e o mapa nativos.");
      return;
    }
    setLocationLoading(true);
    setLocationError(undefined);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationPermission("denied");
        setLocationError("A localização não foi autorizada. Toque em atualizar para tentar novamente.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      setLocationPermission("granted");
    } catch {
      setLocationPermission("denied");
      setLocationError("Não foi possível obter a localização agora. Tente novamente.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void requestLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, [requestLocation]);

  const alertData = useMemo(() => buildDemoAlerts(userLocation), [userLocation]);
  const visibleAlerts = alertData.filter((item) => item.distanceValue <= radius);
  const mapCases = visibleAlerts.length > 0 ? visibleAlerts : alertData.slice(0, 1);

  return (
    <ScreenFrame>
      <View style={styles.feedIntro}>
        <View style={styles.signalLine}><View style={[styles.signalLineFill, { width: 40 }]} /></View>
        <Text style={styles.eyebrow}>CENTRAL DE ALERTAS</Text>
        <Text style={styles.title}>A comunidade está atenta.</Text>
        <Text style={styles.subtitle}>Veja somente os casos próximos da sua região. Informação responsável ajuda sem expor quem precisa de proteção.</Text>
        <Pressable onPress={() => onNavigate("profile")} style={styles.profileAccess} accessibilityRole="button" accessibilityLabel="Abrir meu perfil">
          <Ionicons name="person-circle-outline" size={19} color={COLORS.lime} />
          <Text style={styles.profileAccessText}>Meu perfil</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
        </Pressable>
      </View>

      <View style={styles.feedStatusCard}>
        <View style={styles.feedStatusIcon}><Ionicons name="shield-checkmark-outline" size={20} color={COLORS.lime} /></View>
        <View style={styles.feedStatusCopy}><Text style={styles.feedStatusTitle}>Modo de proteção ativo</Text><Text style={styles.feedStatusText}>{locationPermission === "granted" ? "GPS ativo. Pistas e dados sensíveis não aparecem neste feed." : locationLoading ? "A pedir acesso à localização para aproximar os casos." : "Ative o GPS para organizar os casos ao seu redor."}</Text></View>
        <View style={styles.feedStatusLive}><View style={[styles.liveDot, locationPermission !== "granted" && styles.liveDotWarning]} /><Text style={[styles.feedStatusLiveText, locationPermission !== "granted" && styles.feedStatusLiveTextWarning]}>{locationPermission === "granted" ? "ONLINE" : "LOCAL"}</Text></View>
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Casos próximos</Text><Text style={styles.sectionCount}>{visibleAlerts.length} ativos</Text></View>
      <View style={styles.filterRow}>
        {([5, 15, 50] as Radius[]).map((option) => (
          <Pressable key={option} onPress={() => setRadius(option)} style={[styles.filterChip, radius === option && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, radius === option && styles.filterChipTextActive]}>{option} km</Text>
          </Pressable>
        ))}
      </View>

      <MapPanel
        cases={mapCases}
        userLocation={userLocation}
        locationGranted={locationPermission === "granted"}
        locationLoading={locationLoading}
        locationError={locationError}
        selectedCaseId={selectedCaseId}
        onSelectCase={setSelectedCaseId}
        onRefreshLocation={() => void requestLocation()}
      />

      <View style={styles.alertList}>
        {visibleAlerts.map((item) => <AlertCard key={item.id} {...item} onPress={() => onNavigate("case_detail", item)} />)}
        {visibleAlerts.length === 0 && <View style={styles.emptyState}><Ionicons name="checkmark-circle-outline" size={24} color={COLORS.lime} /><Text style={styles.emptyStateTitle}>Nenhum alerta neste raio</Text><Text style={styles.emptyStateText}>Amplie a distância para consultar a área de proteção.</Text></View>}
      </View>

      <Pressable onPress={() => onNavigate("wizard")} style={styles.outlineAction}>
        <Ionicons name="add-circle-outline" size={19} color={COLORS.lime} /><Text style={styles.outlineActionText}>Iniciar uma notificação responsável</Text><Ionicons name="arrow-forward" size={17} color={COLORS.lime} />
      </Pressable>
      <Text style={styles.disclaimer}>Casos demonstrativos para a apresentação. A localização é usada apenas no dispositivo e nenhum dado é enviado.</Text>
      <BottomNav active="feed" onNavigate={onNavigate} />
    </ScreenFrame>
  );
}

function WebviewMock() {
  return (
    <View style={styles.webviewMock}>
      <View style={styles.webviewTop}><View style={styles.webviewDots}><View style={styles.webviewDot} /><View style={styles.webviewDot} /><View style={styles.webviewDot} /></View><Text style={styles.webviewTitle}>delegaciaeletronica.policiacivil</Text><Ionicons name="lock-closed-outline" size={13} color={COLORS.subtle} /></View>
      <View style={styles.webviewBody}><View style={styles.webviewBadge}><Ionicons name="business-outline" size={23} color={COLORS.lime} /></View><Text style={styles.webviewBodyTitle}>Delegacia Virtual</Text><Text style={styles.webviewBodyText}>Aqui entraria o portal oficial da Polícia Civil do estado selecionado.</Text><View style={styles.webviewNotice}><Ionicons name="information-circle-outline" size={15} color={COLORS.amber} /><Text style={styles.webviewNoticeText}>Webview representada apenas para a apresentação.</Text></View></View>
    </View>
  );
}

function WizardScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [uf, setUf] = useState("SP");
  const [boNumber, setBoNumber] = useState("");
  const [captured, setCaptured] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | undefined>();
  const [captureSource, setCaptureSource] = useState<"camera" | "gallery" | "demo">("demo");
  const [locationReady, setLocationReady] = useState(false);
  const [terms, setTerms] = useState(false);
  const [notice, setNotice] = useState<Notice | undefined>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const goBack = () => {
    setNotice(undefined);
    if (step === 1) onNavigate("feed");
    else setStep((value) => (value - 1) as WizardStep);
  };

  const handleCaptureResult = (result: ImagePicker.ImagePickerResult, source: "camera" | "gallery") => {
    if (result.canceled || !result.assets[0]) return;
    setCaptured(true);
    setCapturedUri(result.assets[0].uri);
    setCaptureSource(source);
    setNotice({ type: "success", message: "Comprovante selecionado apenas neste dispositivo." });
  };

  const handleTakePhoto = async () => {
    setNotice(undefined);
    if (Platform.OS === "web") {
      setCaptured(true);
      setCaptureSource("demo");
      setNotice({ type: "info", message: "A câmera nativa funciona no Expo Go. Aqui o comprovante foi representado para continuar o teste no navegador." });
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setNotice({ type: "error", message: "Permita o acesso à câmera para fotografar o comprovante." });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: false });
      handleCaptureResult(result, "camera");
    } catch {
      setNotice({ type: "error", message: "Não foi possível abrir a câmera. Tente selecionar uma imagem da galeria." });
    }
  };

  const handlePickFromGallery = async () => {
    setNotice(undefined);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice({ type: "error", message: "Permita o acesso à galeria para escolher o comprovante." });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: false, selectionLimit: 1 });
      handleCaptureResult(result, "gallery");
    } catch {
      setNotice({ type: "error", message: "Não foi possível abrir a galeria. Tente usar a câmera." });
    }
  };

  const goNext = () => {
    setNotice(undefined);
    if (step === 1) setStep(2);
    else if (step === 2) {
      if (boNumber.trim().length < 6) {
        setNotice({ type: "error", message: "Informe um número de B.O. com pelo menos 6 caracteres." });
        return;
      }
      if (!captured) {
        setNotice({ type: "error", message: "Fotografe ou selecione o comprovante antes de continuar." });
        return;
      }
      setStep(3);
    }
  };

  const finishAlert = () => {
    if (!locationReady || !terms) {
      setNotice({ type: "error", message: "Confirme a localização simulada e aceite os termos de uso responsável." });
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); setNotice({ type: "success", message: "Notificação criada apenas para demonstração. Nenhum dado foi enviado." }); }, 650);
  };

  return (
    <ScreenFrame onBack={goBack} backLabel={step === 1 ? "Voltar" : "Anterior"}>
      <ProgressDots step={step} />
      <View style={styles.innerIntro}>
        <View style={styles.verificationIcon}><Ionicons name={done ? "checkmark" : step === 1 ? "business-outline" : step === 2 ? "document-text-outline" : "navigate-outline"} size={29} color={COLORS.lime} /></View>
        <Text style={styles.eyebrow}>NOVA NOTIFICAÇÃO</Text>
        <Text style={styles.title}>{done ? "Alerta preparado." : step === 1 ? "Comece pela fonte oficial." : step === 2 ? "Valide o seu B.O." : "Só envie o essencial."}</Text>
        <Text style={styles.subtitle}>{done ? "O resultado abaixo é local e didático para a apresentação." : step === 1 ? "O registro começa com um Boletim de Ocorrência válido da Polícia Civil." : step === 2 ? "A plataforma precisa reconhecer o protocolo antes de organizar o alerta." : "A localização ajuda a direcionar a atenção sem abrir dados sensíveis."}</Text>
      </View>

      <View style={styles.formCard}>
        {done && notice ? <>
          <NoticeBanner notice={notice} />
          <View style={styles.doneSummary}><Ionicons name="shield-checkmark-outline" size={21} color={COLORS.lime} /><Text style={styles.doneSummaryText}>O alerta ficaria disponível apenas para a triagem responsável.</Text></View>
          <PrimaryButton onPress={() => onNavigate("feed")} icon="arrow-forward">Voltar ao feed</PrimaryButton>
        </> : step === 1 ? <>
          <Text style={styles.cardKicker}>1 · ESTADO DA DELEGACIA</Text>
          <Text style={styles.cardTitle}>Selecione a UF</Text>
          <Text style={styles.cardDescription}>Escolha o estado que emitirá o B.O. para abrir a orientação correta.</Text>
          <View style={styles.ufRow}>{["SP", "RJ", "MG", "PR"].map((item) => <Pressable key={item} onPress={() => setUf(item)} style={[styles.ufChip, uf === item && styles.ufChipActive]}><Text style={[styles.ufChipText, uf === item && styles.ufChipTextActive]}>{item}</Text></Pressable>)}</View>
          <WebviewMock />
          <PrimaryButton onPress={goNext} icon="arrow-forward">Continuar para o B.O.</PrimaryButton>
        </> : step === 2 ? <>
          <Text style={styles.cardKicker}>2 · DOCUMENTO OFICIAL</Text>
          <Field label="NÚMERO DO B.O." value={boNumber} onChangeText={(value) => setBoNumber(value.replace(/[^a-zA-Z0-9./-]/g, "").slice(0, 22))} placeholder="Ex.: 2026/0002468" icon="document-text-outline" autoCapitalize="characters" />
          <Text style={styles.captureLabel}>COMPROVANTE DO B.O.</Text>
          <View style={styles.captureActions}>
            <Pressable onPress={() => void handleTakePhoto()} style={[styles.captureButton, captured && captureSource === "camera" && styles.captureButtonActive]} accessibilityRole="button">
              <Ionicons name="camera-outline" size={20} color={COLORS.lime} />
              <Text style={styles.captureButtonText}>Câmera</Text>
            </Pressable>
            <Pressable onPress={() => void handlePickFromGallery()} style={[styles.captureButton, captured && captureSource === "gallery" && styles.captureButtonActive]} accessibilityRole="button">
              <Ionicons name="images-outline" size={20} color={COLORS.lime} />
              <Text style={styles.captureButtonText}>Galeria</Text>
            </Pressable>
          </View>
          {capturedUri ? <View style={styles.documentPreview}><Image source={{ uri: capturedUri }} style={styles.documentPreviewImage} /><View style={styles.documentPreviewCopy}><Text style={styles.documentPreviewTitle}>Comprovante anexado</Text><Text style={styles.documentPreviewText}>Imagem guardada apenas localmente · {captureSource === "camera" ? "capturada pela câmera" : "escolhida da galeria"}</Text></View><Ionicons name="checkmark-circle" size={21} color={COLORS.lime} /></View> : captured ? <View style={styles.demoCapture}><Ionicons name="checkmark-circle-outline" size={18} color={COLORS.lime} /><Text style={styles.demoCaptureText}>Comprovante demonstrativo preparado no navegador</Text></View> : null}
          {notice && <NoticeBanner notice={notice} />}
          <Text style={styles.helperText}>No telemóvel, você pode fotografar ou escolher o comprovante. A imagem não é publicada nem enviada nesta versão.</Text>
          <PrimaryButton onPress={goNext} icon="arrow-forward">Continuar para localização</PrimaryButton>
        </> : <>
          <Text style={styles.cardKicker}>3 · LOCALIZAÇÃO E TERMOS</Text>
          <Pressable onPress={() => setLocationReady(true)} style={[styles.locationCard, locationReady && styles.locationCardActive]}><View style={styles.locationIcon}><Ionicons name={locationReady ? "checkmark" : "locate-outline"} size={20} color={COLORS.lime} /></View><View style={styles.locationCopy}><Text style={styles.locationTitle}>{locationReady ? "Localização simulada pronta" : "Usar localização do último avistamento"}</Text><Text style={styles.locationText}>{locationReady ? "Avenida Paulista, São Paulo · precisão demonstrativa" : "Nenhuma coordenada real será capturada nesta versão."}</Text></View><Ionicons name="chevron-forward" size={17} color={COLORS.subtle} /></Pressable>
          <Pressable onPress={() => setTerms((value) => !value)} style={styles.checkboxRow}><View style={[styles.checkbox, terms && styles.checkboxChecked]}>{terms && <Ionicons name="checkmark" size={14} color={COLORS.background} />}</View><Text style={styles.checkboxText}>Li e aceito utilizar a plataforma com responsabilidade, sem espalhar imagens ou dados sensíveis.</Text></Pressable>
          {notice && <NoticeBanner notice={notice} />}
          <PrimaryButton onPress={finishAlert} loading={loading} icon="shield-checkmark">Criar alerta demonstrativo</PrimaryButton>
        </>}
      </View>
      {!done && <Text style={styles.demoHint}>Demonstração local · UF {uf} · sem integração com Polícia Civil.</Text>}
      <BottomNav active="wizard" onNavigate={onNavigate} />
    </ScreenFrame>
  );
}

function SignupScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [notice, setNotice] = useState<Notice | undefined>();
  const handleSignup = async () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "Informe o seu nome.";
    if (!email.trim() || !email.includes("@")) nextErrors.email = "Digite um e-mail válido.";
    if (password.length < 12) nextErrors.password = "Use pelo menos 12 caracteres.";
    if (confirmPassword !== password) nextErrors.confirm = "As palavras-passe não coincidem.";
    setErrors(nextErrors);
    setNotice(undefined);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    try {
      await GuardiaoAuth.registerAccount(name.trim(), email.trim(), password);
      onNavigate("verify");
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Falha ao criar conta." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenFrame onBack={() => onNavigate("login")}>
      <ProgressDots step={1} />
      <View style={styles.innerIntro}>
        <Text style={styles.eyebrow}>NOVO ACESSO</Text>
        <Text style={styles.title}>Crie o seu espaço seguro.</Text>
        <Text style={styles.subtitle}>Uma conta validada ajuda a manter a rede de apoio mais confiável.</Text>
      </View>

      <View style={styles.formCard}>
        <Field label="NOME COMPLETO" value={name} onChangeText={(value) => { setName(value); setErrors((prev) => ({ ...prev, name: "" })); }} placeholder="Como podemos chamar você?" icon="person-outline" autoCapitalize="words" error={errors.name} />
        <Field label="E-MAIL" value={email} onChangeText={(value) => { setEmail(value); setErrors((prev) => ({ ...prev, email: "" })); }} placeholder="voce@exemplo.com" icon="mail-outline" keyboardType="email-address" error={errors.email} />
        <Field label="PALAVRA-PASSE" value={password} onChangeText={(value) => { setPassword(value); setErrors((prev) => ({ ...prev, password: "" })); }} placeholder="Mínimo de 12 caracteres" icon="lock-closed-outline" secureTextEntry={!showPassword} onToggleSecure={() => setShowPassword((value) => !value)} error={errors.password} />
        <Field label="CONFIRME A PALAVRA-PASSE" value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setErrors((prev) => ({ ...prev, confirm: "" })); }} placeholder="Repita a sua palavra-passe" icon="checkmark-circle-outline" secureTextEntry={!showConfirm} onToggleSecure={() => setShowConfirm((value) => !value)} error={errors.confirm} />
        <Text style={styles.helperText}>Cadastro real no banco local. O e-mail ainda NÃO será verificado; use apenas dados fictícios para testes.</Text>
        {notice && <NoticeBanner notice={notice} />}
        <PrimaryButton onPress={handleSignup} loading={loading} icon="arrow-forward">
          Criar a minha conta
        </PrimaryButton>
      </View>
    </ScreenFrame>
  );
}

function VerifyScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<Notice | undefined>();
  const [loading, setLoading] = useState(false);
  const isVerified = notice?.type === "success";

  const handleVerify = () => {
    if (code.trim().length !== 6) {
      setNotice({ type: "error", message: "Digite o código de 6 números recebido no seu e-mail." });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setNotice(code === DEMO_CODE
        ? { type: "success", message: "Código demonstrativo aceito. A conta foi criada no banco, mas o e-mail NÃO foi verificado." }
        : { type: "error", message: "Esse código não confere. Para a demonstração, use 246810." });
    }, 500);
  };

  return (
    <ScreenFrame onBack={() => onNavigate("signup")}>
      <ProgressDots step={2} />
      <View style={styles.innerIntro}>
        <View style={styles.verificationIcon}><Ionicons name={isVerified ? "checkmark" : "mail-open-outline"} size={30} color={COLORS.lime} /></View>
        <Text style={styles.eyebrow}>VALIDAR CONTA</Text>
        <Text style={styles.title}>{isVerified ? "Tudo certo por aqui." : "Só mais um cuidado."}</Text>
        <Text style={styles.subtitle}>{isVerified ? "Código de demonstração aceito. Sua identidade NÃO foi verificada." : "Etapa didática: use o código fixo. Nenhum e-mail é enviado nem verificado."}</Text>
      </View>

      <View style={styles.formCard}>
        {!isVerified && (
          <>
            <Text style={styles.cardKicker}>CÓDIGO DE DEMONSTRAÇÃO</Text>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={COLORS.subtle}
              keyboardType="numeric"
              maxLength={6}
              selectionColor={COLORS.lime}
              style={styles.codeInput}
              textContentType="oneTimeCode"
            />
            {notice && <NoticeBanner notice={notice} />}
            <PrimaryButton onPress={handleVerify} loading={loading} icon="checkmark">
              Validar a minha conta
            </PrimaryButton>
            <Pressable onPress={() => setNotice({ type: "info", message: "Novo código enviado (simulação local)." })} style={styles.centerLink}>
              <Text style={styles.linkText}>Reenviar código</Text>
            </Pressable>
          </>
        )}
        {isVerified && (
          <>
            <NoticeBanner notice={notice} />
            <PrimaryButton onPress={() => onNavigate("login")} icon="arrow-forward">
              Ir para o login
            </PrimaryButton>
          </>
        )}
      </View>
      <Text style={styles.demoHint}>Dica para a apresentação: use o código 246810.</Text>
    </ScreenFrame>
  );
}

function ForgotScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [notice, setNotice] = useState<Notice | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const sent = notice?.type === "success";

  const handleRecover = () => {
    setError("");
    if (!identifier.trim()) {
      setError("Informe o e-mail ou CPF da sua conta.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setNotice({ type: "success", message: "Pedido registado no protótipo. Verifique o seu e-mail quando esta função estiver ligada." });
    }, 650);
  };

  return (
    <ScreenFrame onBack={() => onNavigate("login")}>
      <ProgressDots step={3} />
      <View style={styles.innerIntro}>
        <View style={styles.verificationIcon}><Ionicons name={sent ? "checkmark" : "key-outline"} size={29} color={COLORS.lime} /></View>
        <Text style={styles.eyebrow}>RECUPERAR ACESSO</Text>
        <Text style={styles.title}>{sent ? "Pedido recebido." : "Acontece com todo mundo."}</Text>
        <Text style={styles.subtitle}>{sent ? "Este é um retorno simulado para a sua apresentação." : "Informe um dado da sua conta e mostramos como será a recuperação."}</Text>
      </View>

      <View style={styles.formCard}>
        {!sent ? (
          <>
            <Field label="E-MAIL OU CPF" value={identifier} onChangeText={setIdentifier} placeholder="Digite o e-mail ou CPF" icon="person-outline" keyboardType="email-address" error={error} />
            <PrimaryButton onPress={handleRecover} loading={loading} icon="arrow-forward">
              Continuar
            </PrimaryButton>
          </>
        ) : (
          <>
            {notice && <NoticeBanner notice={notice} />}
            <PrimaryButton onPress={() => onNavigate("login")} icon="arrow-forward">
              Voltar para o login
            </PrimaryButton>
          </>
        )}
      </View>
    </ScreenFrame>
  );
}

function GovScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <ScreenFrame onBack={() => onNavigate("login")}>
      <View style={styles.govHero}>
        <View style={styles.govLargeBadge}><Text style={styles.govLargeBadgeText}>G</Text></View>
        <Text style={styles.eyebrow}>ACESSO INSTITUCIONAL</Text>
        <Text style={styles.title}>Gov.br, por enquanto só no papel.</Text>
        <Text style={styles.subtitle}>Esta opção existe para representar o fluxo futuro. A integração oficial ainda não faz parte desta versão.</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.infoRow}>
          <Ionicons name="flask-outline" size={20} color={COLORS.lime} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Modo demonstrativo</Text>
            <Text style={styles.infoText}>Nenhum dado será enviado ao Gov.br e nenhuma autenticação externa será iniciada.</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.lime} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Integração prevista</Text>
            <Text style={styles.infoText}>Na versão completa, o acesso deverá respeitar autenticação segura e validação de identidade.</Text>
          </View>
        </View>
        <PrimaryButton onPress={() => onNavigate("login")} icon="arrow-back">
          Voltar para o login
        </PrimaryButton>
      </View>
    </ScreenFrame>
  );
}

function SensorsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [{ x: ax, y: ay, z: az }, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [{ x: gx, y: gy, z: gz }, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(
    () =>
      Platform.OS !== "web" &&
      typeof Accelerometer?.addListener === "function" &&
      typeof Gyroscope?.addListener === "function"
  );

  useEffect(() => {
    // 1. Leitura de GPS via expo-location
    async function getGPS() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setGpsError("Permissão de GPS negada");
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy ?? 0,
        });
      } catch (e) {
        setGpsError("Erro ao obter GPS");
      }
    }

    getGPS();


    // 2. Leitura de Sensores de Movimento via expo-sensors
    const hasAccel = typeof Accelerometer?.addListener === "function";
    const hasGyro = typeof Gyroscope?.addListener === "function";

    if (Platform.OS === "web" || !hasAccel || !hasGyro) {
      return;
    }

    let cancelled = false;

    let accelSub:
      | ReturnType<typeof Accelerometer.addListener>
      | undefined;

    let gyroSub:
      | ReturnType<typeof Gyroscope.addListener>
      | undefined;

    async function iniciarSensores() {
      try {
        const [accelAvailable, gyroAvailable] = await Promise.all([
          Accelerometer.isAvailableAsync(),
          Gyroscope.isAvailableAsync(),
        ]);

        if (cancelled) return;

        if (!accelAvailable || !gyroAvailable) {
          setIsSupported(false);
          return;
        }

        Accelerometer.setUpdateInterval(300);
        Gyroscope.setUpdateInterval(300);

        accelSub = Accelerometer.addListener(setAccelData);
        gyroSub = Gyroscope.addListener(setGyroData);
      } catch {
        accelSub?.remove();
        gyroSub?.remove();

        if (!cancelled) {
          setIsSupported(false);
        }
      }
    }

    void iniciarSensores();

    return () => {
      cancelled = true;
      accelSub?.remove();
      gyroSub?.remove();
    };
  }, []);


  return (
    <ScreenFrame onBack={() => onNavigate("feed")}>
      <View style={styles.innerIntro}>
        <View style={styles.verificationIcon}>
          <Ionicons name="hardware-chip-outline" size={29} color={COLORS.lime} />
        </View>
        <Text style={styles.eyebrow}>HARDWARE NATIVO</Text>
        <Text style={styles.title}>Laboratório de Sensores</Text>
        <Text style={styles.subtitle}>
          Leitura em tempo real do Acelerômetro, Giroscópio e Localizador GPS.
        </Text>
      </View>

      {!isSupported && (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.amber} />
          <Text style={[styles.noticeText, { color: COLORS.amber }]}>
            A leitura nativa de sensores requer execução no aplicativo móvel (Expo Go). Na Web, o app exibe modo demonstrativo.
          </Text>
        </View>
      )}

      <View style={styles.formCard}>
        {/* BLOCO 1: GPS */}
        <Text style={styles.cardKicker}>1 · POSICIONAMENTO GLOBAL (GPS)</Text>
        {coords ? (
          <View style={styles.captureActions}>
            <View style={styles.ufChip}>
              <Text style={styles.fieldLabel}>LATITUDE</Text>
              <Text style={{ color: COLORS.lime, fontWeight: "800", fontSize: 11 }}>{coords.lat.toFixed(4)}</Text>
            </View>
            <View style={styles.ufChip}>
              <Text style={styles.fieldLabel}>LONGITUDE</Text>
              <Text style={{ color: COLORS.lime, fontWeight: "800", fontSize: 11 }}>{coords.lng.toFixed(4)}</Text>
            </View>
            <View style={styles.ufChip}>
              <Text style={styles.fieldLabel}>PRECISÃO</Text>
              <Text style={{ color: COLORS.lime, fontWeight: "800", fontSize: 11 }}>{coords.accuracy.toFixed(0)}m</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: COLORS.muted, fontSize: 12, marginVertical: 6 }}>
            {gpsError ?? "Carregando coordenadas do GPS..."}
          </Text>
        )}

        {/* BLOCO 2: ACELERÔMETRO */}
        <Text style={[styles.cardKicker, { marginTop: 15 }]}>2 · ACELERÔMETRO (MOVIMENTO)</Text>
        <View style={styles.captureActions}>
          <View style={styles.ufChip}>
            <Text style={styles.fieldLabel}>EIXO X</Text>
            <Text style={styles.linkText}>{ax.toFixed(2)}</Text>
          </View>
          <View style={styles.ufChip}>
            <Text style={styles.fieldLabel}>EIXO Y</Text>
            <Text style={styles.linkText}>{ay.toFixed(2)}</Text>
          </View>
          <View style={styles.ufChip}>
            <Text style={styles.fieldLabel}>EIXO Z</Text>
            <Text style={styles.linkText}>{az.toFixed(2)}</Text>
          </View>
        </View>

        {/* BLOCO 3: GIROSCÓPIO */}
        <Text style={[styles.cardKicker, { marginTop: 15 }]}>3 · GIROSCÓPIO (ROTAÇÃO)</Text>
        <View style={styles.captureActions}>
          <View style={styles.ufChip}>
            <Text style={styles.fieldLabel}>GIRO X</Text>
            <Text style={{ color: COLORS.amber, fontWeight: "800" }}>{gx.toFixed(2)}</Text>
          </View>
          <View style={styles.ufChip}>
            <Text style={styles.fieldLabel}>GIRO Y</Text>
            <Text style={{ color: COLORS.amber, fontWeight: "800" }}>{gy.toFixed(2)}</Text>
          </View>
          <View style={styles.ufChip}>
            <Text style={styles.fieldLabel}>GIRO Z</Text>
            <Text style={{ color: COLORS.amber, fontWeight: "800" }}>{gz.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <BottomNav active="sensors" onNavigate={onNavigate} />
    </ScreenFrame>
  );
}

import { Linking } from "react-native";

function CaseDetailScreen({
  onNavigate,
  selectedCase,
}: {
  onNavigate: (screen: Screen, caseData?: DemoAlert) => void;
  selectedCase?: DemoAlert | null;
}) {
  const handleCallPolice = (number: string) => {
    void Linking.openURL(`tel:${number}`);
  };

  // Dados dinâmicos ou fallback caso não passe nenhum
  const caseTitle = selectedCase?.title ?? "Caso Não Identificado";
  const caseAge = selectedCase?.age ?? "Não informada";
  const caseNeighborhood = selectedCase?.neighborhood ?? "Região Central";
  const caseTime = selectedCase?.time ?? "Atualizado recentemente";

  return (
    <ScreenFrame onBack={() => onNavigate("feed")} backLabel="Voltar aos Alertas">
      <View>
        {/* Alerta Visual de Emergência */}
        <View style={[styles.notice, { borderColor: `${COLORS.coral}66`, backgroundColor: `${COLORS.coral}15` }]}>
          <Ionicons name="warning-outline" size={20} color={COLORS.coral} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.coral, fontWeight: "800", fontSize: 12 }}>RECONHECEU AS CARACTERÍSTICAS?</Text>
            <Text style={{ color: COLORS.text, fontSize: 11, marginTop: 2 }}>
              Não tente intervir sozinho. Acione os canais oficiais imediatamente.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {/* Cabeçalho Dinâmico */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
            <View>
              <Text style={styles.cardKicker}>CASO REGISTRADO · SP</Text>
              <Text style={styles.cardTitle}>{caseTitle}</Text>
              <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>
                {caseNeighborhood} · {caseTime}
              </Text>
            </View>
            <View style={{ backgroundColor: "#202A22", borderWidth: 1, borderColor: "#43552A", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }}>
              <Text style={{ color: COLORS.lime, fontSize: 9, fontWeight: "800" }}>BO VALIDADO</Text>
            </View>
          </View>

          {/* Avatar e Características Físicas Protegidas */}
          <View style={{ backgroundColor: COLORS.surfaceRaised, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 15, alignItems: "center", marginBottom: 18 }}>
            <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: "#202A22", borderWidth: 2, borderColor: COLORS.lime, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Ionicons name="person-outline" size={36} color={COLORS.lime} />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: "800" }}>Identificação por Características</Text>
            <Text style={{ color: COLORS.subtle, fontSize: 10, textAlign: "center", marginTop: 2, marginBottom: 12 }}>
              Imagem protegida em conformidade com o ECA/LGPD
            </Text>

            <View style={{ width: "100%", gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 }}>
                <Text style={styles.fieldLabel}>IDADE ESTIMADA</Text>
                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "700" }}>{caseAge}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 }}>
                <Text style={styles.fieldLabel}>TOM DE PELE</Text>
                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "700" }}>Parda / Clara</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 }}>
                <Text style={styles.fieldLabel}>REGIAO DA OCORRÊNCIA</Text>
                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "700" }}>{caseNeighborhood}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 2 }}>
                <Text style={styles.fieldLabel}>STATUS DO CASO</Text>
                <Text style={{ color: COLORS.lime, fontSize: 12, fontWeight: "700" }}>Em Triagem Oficial</Text>
              </View>
            </View>
          </View>

          {/* Registro do B.O. */}
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.cardKicker}>REGISTRO OFICIAL DE POLÍCIA</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.muted} />
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: "800" }}>B.O. nº BO-2026-984123</Text>
            </View>
          </View>

          {/* Ações de Emergência */}
          <Text style={[styles.cardKicker, { marginBottom: 10 }]}>AÇÕES DE EMERGÊNCIA</Text>
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => handleCallPolice("181")}
              style={[styles.primaryButton, { backgroundColor: "#1A261D", borderWidth: 1, borderColor: COLORS.lime }]}
            >
              <Ionicons name="call-outline" size={18} color={COLORS.lime} />
              <Text style={[styles.primaryButtonText, { color: COLORS.lime }]}>Enviar Pista Sigilosa (Disque 181)</Text>
            </Pressable>

            <Pressable
              onPress={() => handleCallPolice("190")}
              style={[styles.primaryButton, { backgroundColor: COLORS.coral }]}
            >
              <Ionicons name="alert-circle" size={18} color={COLORS.background} />
              <Text style={[styles.primaryButtonText, { color: COLORS.background }]}>Ligar para Polícia Militar (190)</Text>
            </Pressable>
          </View>
        </View>

        <BottomNav active="feed" onNavigate={onNavigate} />
      </View>
    </ScreenFrame>
  );
}


function ProfileScreen({
  onNavigate,
  onSessionExpired,
  onCredentialsChanged,
}: {
  onNavigate: (screen: Screen) => void;
  onSessionExpired: () => void;
  onCredentialsChanged: (message: string) => void;
}) {
  const [account, setAccount] = useState<GuardiaoAuth.GuardiaoAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<Notice | null>(null);
  const [securityMode, setSecurityMode] = useState<"password" | "email" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  const clearSecurityInputs = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setNewEmail("");
    setSecurityError(null);
  };

  const chooseSecurityMode = (mode: "password" | "email") => {
    if (securitySaving) return;
    clearSecurityInputs();
    setEditingName(false);
    setSecurityMode(mode);
  };

  const cancelSecurityMode = () => {
    if (securitySaving) return;
    clearSecurityInputs();
    setSecurityMode(null);
  };

  const saveSecurityChange = async () => {
    if (!securityMode || securitySaving) return;
    setSecurityError(null);
    if (!currentPassword) {
      setSecurityError("Informe sua palavra-passe atual.");
      return;
    }
    if (securityMode === "password") {
      if (newPassword.length < 12 || newPassword.length > 128) {
        setSecurityError("A nova palavra-passe deve ter entre 12 e 128 caracteres.");
        return;
      }
      if (newPassword === currentPassword) {
        setSecurityError("A nova palavra-passe deve ser diferente da atual.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setSecurityError("A confirmação da nova palavra-passe não confere.");
        return;
      }
    } else {
      const email = newEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
        setSecurityError("Informe um e-mail válido.");
        return;
      }
      if (email === account?.email) {
        setSecurityError("O novo e-mail deve ser diferente do atual.");
        return;
      }
    }
    setSecuritySaving(true);
    try {
      if (securityMode === "password") {
        await GuardiaoAuth.changeAccountPassword(currentPassword, newPassword);
      } else {
        await GuardiaoAuth.changeAccountEmail(currentPassword, newEmail.trim());
      }
      clearSecurityInputs();
      onCredentialsChanged(securityMode === "password"
        ? "Palavra-passe atualizada. Entre novamente."
        : "E-mail atualizado e ainda não verificado. Entre com o novo e-mail.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível atualizar a conta.";
      if (/sessão inválida|expirada/i.test(message)) {
        clearSecurityInputs();
        onSessionExpired();
        return;
      }
      setSecurityError(message);
    } finally {
      setSecuritySaving(false);
    }
  };

  useEffect(() => {
    let active = true;
    GuardiaoAuth.currentAccount()
      .then((result) => {
        if (!active) return;
        if (!result) {
          onSessionExpired();
          return;
        }
        setAccount(result);
        setDraftName(result.name);
      })
      .catch(() => {
        if (active) setError("Não foi possível consultar o perfil. Verifique a conexão com o servidor.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [onSessionExpired, reload]);

  const tryAgain = () => {
    setAccount(null);
    setError(null);
    setLoading(true);
    setReload((value) => value + 1);
  };

  const startEditingName = () => {
    if (!account) return;
    setDraftName(account.name);
    setNameError(null);
    setSaveNotice(null);
    clearSecurityInputs();
    setSecurityMode(null);
    setEditingName(true);
  };

  const cancelEditingName = () => {
    if (savingName) return;
    setDraftName(account?.name ?? "");
    setEditingName(false);
    setNameError(null);
  };

  const saveName = async () => {
    const name = draftName.trim();
    if (name.length < 2 || name.length > 120 || /[\u0000-\u001F\u007F]/u.test(name)) {
      setNameError("Informe um nome de 2 a 120 caracteres, sem quebras de linha.");
      return;
    }
    setNameError(null);
    setSavingName(true);
    try {
      const updated = await GuardiaoAuth.updateAccountName(name);
      setAccount(updated);
      setDraftName(updated.name);
      setEditingName(false);
      setSaveNotice({ type: "success", message: "Nome atualizado no banco de dados." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível atualizar o nome.";
      if (/sessão inválida|expirada/i.test(message)) {
        onSessionExpired();
        return;
      }
      setNameError(message);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <ScreenFrame onBack={() => onNavigate("feed")} backLabel="Voltar aos alertas">
      <View style={styles.innerIntro}>
        <Text style={styles.eyebrow}>MINHA CONTA</Text>
        <Text style={styles.title}>Meu Perfil</Text>
        <Text style={styles.subtitle}>Informações da conta consultadas com segurança no servidor local.</Text>
      </View>

      {loading ? (
        <View style={styles.profileLoading}>
          <ActivityIndicator color={COLORS.lime} size="large" />
          <Text style={styles.profileHint}>A consultar os seus dados...</Text>
        </View>
      ) : error ? (
        <View style={styles.formCard}>
          <NoticeBanner notice={{ type: "error", message: error }} />
          <PrimaryButton onPress={tryAgain} icon="refresh-outline">Tentar novamente</PrimaryButton>
        </View>
      ) : account ? (
        <View style={styles.profileCard}>
          {saveNotice ? <NoticeBanner notice={saveNotice} /> : null}
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person-outline" size={26} color={COLORS.lime} />
            </View>
            <View style={styles.profileHeaderCopy}>
              <Text style={styles.profileName}>{account.name}</Text>
              <Text style={styles.profileHint}>Conta local do Guardião</Text>
            </View>
          </View>
          {!editingName ? (
            <Pressable
              onPress={startEditingName}
              accessibilityRole="button"
              accessibilityLabel="Editar nome da conta"
              style={styles.profileEditAction}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.lime} />
              <Text style={styles.profileEditActionText}>Editar meu nome</Text>
            </Pressable>
          ) : (
            <View style={styles.profileEditPanel}>
              <Field
                label="NOVO NOME"
                value={draftName}
                onChangeText={(value) => { setDraftName(value); setNameError(null); }}
                placeholder="Como podemos chamar você?"
                icon="person-outline"
                autoCapitalize="words"
                error={nameError ?? undefined}
              />
              <PrimaryButton onPress={() => { void saveName(); }} loading={savingName} icon="checkmark-outline">
                Salvar nome
              </PrimaryButton>
              <Pressable
                onPress={cancelEditingName}
                disabled={savingName}
                accessibilityRole="button"
                style={styles.profileCancelAction}
              >
                <Text style={styles.profileCancelText}>Cancelar edição</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.profileSeparator} />
          <Text style={styles.profileLabel}>E-MAIL</Text>
          <Text style={styles.profileValue} selectable>{account.email}</Text>
          <View style={styles.profileSeparator} />
          <Text style={styles.profileLabel}>VERIFICAÇÃO DO E-MAIL</Text>
          <View style={styles.profileStatus}>
            <Ionicons
              name={account.emailVerified ? "checkmark-circle-outline" : "alert-circle-outline"}
              size={18}
              color={account.emailVerified ? COLORS.lime : COLORS.amber}
            />
            <Text style={[styles.profileStatusText, { color: account.emailVerified ? COLORS.lime : COLORS.amber }]}>
              {account.emailVerified ? "E-mail verificado" : "E-mail ainda não verificado"}
            </Text>
          </View>
          {!account.emailVerified && (
            <Text style={styles.profileHint}>O código 246810 utilizado na apresentação é demonstrativo e não verifica o e-mail.</Text>
          )}
          <View style={styles.profileSeparator} />
          <Text style={styles.profileLabel}>DATA DE CADASTRO</Text>
          <Text style={styles.profileValue}>{formatGuardiaoProfileDate(account.createdDate)}</Text>
          <View style={styles.profileSeparator} />
          <Text style={styles.profileLabel}>ÚLTIMA ATUALIZAÇÃO</Text>
          <Text style={styles.profileValue}>{formatGuardiaoProfileDate(account.updatedDate)}</Text>
          <View style={styles.profileSeparator} />
          <Text style={styles.profileLabel}>SEGURANÇA DA CONTA</Text>
          {!securityMode ? (
            <View style={styles.profileSecurityActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alterar minha palavra-passe"
                onPress={() => chooseSecurityMode("password")}
                style={styles.profileEditAction}
              >
                <Ionicons name="key-outline" size={16} color={COLORS.lime} />
                <Text style={styles.profileEditActionText}>Alterar palavra-passe</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alterar meu e-mail"
                onPress={() => chooseSecurityMode("email")}
                style={styles.profileEditAction}
              >
                <Ionicons name="mail-outline" size={16} color={COLORS.lime} />
                <Text style={styles.profileEditActionText}>Alterar e-mail</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.profileEditPanel}>
              <Text style={styles.profileSecurityTitle}>
                {securityMode === "password" ? "Alterar palavra-passe" : "Alterar e-mail"}
              </Text>
              <Text style={styles.profileHint}>
                Após a alteração, todas as sessões serão encerradas. Você precisará entrar novamente.
              </Text>
              {securityMode === "email" && (
                <Text style={[styles.profileHint, { marginTop: 8, marginBottom: 10 }]}>
                  A troca não verifica a titularidade do novo e-mail; a verificação por mensagem ainda não está disponível.
                </Text>
              )}
              <View style={{ marginTop: 14 }}>
                <Field
                  label="PALAVRA-PASSE ATUAL"
                  value={currentPassword}
                  onChangeText={(value) => { setCurrentPassword(value); setSecurityError(null); }}
                  placeholder="Confirme a palavra-passe atual"
                  icon="lock-closed-outline"
                  secureTextEntry
                />
                {securityMode === "password" ? (
                  <>
                    <Field
                      label="NOVA PALAVRA-PASSE"
                      value={newPassword}
                      onChangeText={(value) => { setNewPassword(value); setSecurityError(null); }}
                      placeholder="De 12 a 128 caracteres"
                      icon="key-outline"
                      secureTextEntry
                    />
                    <Field
                      label="CONFIRME A NOVA PALAVRA-PASSE"
                      value={confirmNewPassword}
                      onChangeText={(value) => { setConfirmNewPassword(value); setSecurityError(null); }}
                      placeholder="Repita a nova palavra-passe"
                      icon="checkmark-circle-outline"
                      secureTextEntry
                    />
                  </>
                ) : (
                  <Field
                    label="NOVO E-MAIL"
                    value={newEmail}
                    onChangeText={(value) => { setNewEmail(value); setSecurityError(null); }}
                    placeholder="novo.email@example.com"
                    icon="mail-outline"
                    keyboardType="email-address"
                  />
                )}
              </View>
              {securityError && <NoticeBanner notice={{ type: "error", message: securityError }} />}
              <PrimaryButton
                onPress={() => { void saveSecurityChange(); }}
                loading={securitySaving}
                icon="checkmark-outline"
              >
                {securityMode === "password" ? "Salvar palavra-passe" : "Salvar e-mail"}
              </PrimaryButton>
              <Pressable
                accessibilityRole="button"
                onPress={cancelSecurityMode}
                disabled={securitySaving}
                style={styles.profileCancelAction}
              >
                <Text style={styles.profileCancelText}>Cancelar alteração</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
      <Text style={styles.disclaimer}>Nome, e-mail e palavra-passe podem ser alterados. O e-mail ainda não possui verificação real.</Text>
    </ScreenFrame>
  );
}

export default function HomeScreen() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedCase, setSelectedCase] = useState<DemoAlert | null>(null); // Guardará a criança clicada
  const [transitionKey, setTransitionKey] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    GuardiaoAuth.currentAccount()
      .then((account) => {
        if (!active) return;
        if (account) {
          setAuthenticated(true);
          setScreen("feed");
        }
      })
      .catch(() => {
        // Falha de rede não significa uma sessão válida.
      })
      .finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, []);

  const onLogin = () => {
    setAuthenticated(true);
    setAuthError(null);
    setScreen("feed");
    setTransitionKey((value) => value + 1);
  };

  const handleLogout = async () => {
    try {
      await GuardiaoAuth.logoutAccount();
      setAuthenticated(false);
      setAuthError(null);
      setScreen("login");
      setTransitionKey((value) => value + 1);
    } catch {
      const message = "Não foi possível revogar a sessão. Verifique a conexão com o servidor e tente novamente.";
      setAuthError(message);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(message);
      } else {
        Alert.alert("Falha ao sair", message);
      }
    }
  };

  const onNavigate = (nextScreen: Screen, caseData?: DemoAlert) => {
    if (nextScreen === "login" && authenticated) {
      void handleLogout();
      return;
    }
    if (["feed", "wizard", "sensors", "case_detail", "profile"].includes(nextScreen) && !authenticated) {
      setScreen("login");
      return;
    }
    if (caseData){
      setSelectedCase(caseData);
    }
    setScreen(nextScreen);
    setTransitionKey((value) => value + 1);
  };

  const currentScreen = useMemo(() => {
    switch (screen) {
      case "signup":
        return <SignupScreen onNavigate={onNavigate} />;
      case "verify":
        return <VerifyScreen onNavigate={onNavigate} />;
      case "forgot":
        return <ForgotScreen onNavigate={onNavigate} />;
      case "gov":
        return <GovScreen onNavigate={onNavigate} />;
      case "feed":
        return <FeedScreen onNavigate={onNavigate} />;
      case "wizard":
        return <WizardScreen onNavigate={onNavigate} />;
      case "sensors":
        return <SensorsScreen onNavigate={onNavigate} />;
      case "case_detail":
        return <CaseDetailScreen onNavigate={onNavigate} selectedCase={selectedCase} />;
      case "profile":
        return <ProfileScreen onNavigate={onNavigate} onSessionExpired={() => {
          setAuthenticated(false);
          setAuthError("A sua sessão expirou. Entre novamente.");
          setScreen("login");
          setTransitionKey((value) => value + 1);
        }} onCredentialsChanged={(message) => {
          setAuthenticated(false);
          setAuthError(message);
          setScreen("login");
          setTransitionKey((value) => value + 1);
        }} />;
      default:
        return <LoginScreen onNavigate={onNavigate} onLogin={onLogin} externalError={authError} />;
    }
  }, [screen, selectedCase, authenticated, authError]);

  if (sessionLoading) {
    return <View style={[styles.app, { justifyContent: "center" }]}><ActivityIndicator color={COLORS.lime} /></View>;
  }

  return (
    <KeyboardAvoidingView key={transitionKey} style={styles.app} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      {currentScreen}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  page: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  topBar: { minHeight: 52, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandCompact: { gap: 9 },
  brandIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#202A22", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#43552A" },
  wordmark: { color: COLORS.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  wordmarkCompact: { fontSize: 16 },
  brandCaption: { color: COLORS.subtle, fontSize: 10, marginTop: 2, letterSpacing: 0.2 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 6, backgroundColor: COLORS.lime },
  liveDotWarning: { backgroundColor: COLORS.amber },
  livePillText: { color: COLORS.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  backButtonText: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 36 },
  content: { width: "100%", maxWidth: 438, alignSelf: "center" },
  loginIntro: { paddingTop: 32, paddingBottom: 23 },
  innerIntro: { paddingTop: 18, paddingBottom: 22 },
  signalLine: { width: 44, height: 4, borderRadius: 99, backgroundColor: COLORS.border, marginBottom: 20, overflow: "hidden" },
  signalLineFill: { width: 29, height: 4, borderRadius: 99, backgroundColor: COLORS.lime },
  eyebrow: { color: COLORS.lime, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 12 },
  title: { color: COLORS.text, fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.3, maxWidth: 390 },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginTop: 13, maxWidth: 390 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 26, borderWidth: 1, borderColor: COLORS.border, padding: 20, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  cardKicker: { color: COLORS.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 },
  cardTitle: { color: COLORS.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  cardDescription: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 22 },
  fieldWrap: { marginBottom: 15 },
  fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  inputShell: { minHeight: 53, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, backgroundColor: COLORS.surfaceRaised, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 11 },
  inputShellError: { borderColor: `${COLORS.coral}AA` },
  input: { flex: 1, color: COLORS.text, fontSize: 14, minHeight: 51, paddingVertical: 0 },
  fieldError: { color: COLORS.coral, fontSize: 11, lineHeight: 15, marginTop: 6 },
  forgotLink: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 5, marginTop: -1, marginBottom: 18 },
  linkText: { color: COLORS.lime, fontSize: 13, fontWeight: "800" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 15 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  primaryButton: { minHeight: 54, borderRadius: 16, backgroundColor: COLORS.lime, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16 },
  primaryButtonPressed: { opacity: 0.58 },
  primaryButtonText: { color: COLORS.background, fontSize: 14, fontWeight: "900", letterSpacing: -0.1 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 11, marginVertical: 19 },
  divider: { height: 1, flex: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  govButton: { minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#171D1B", flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 11 },
  govBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EBF3F2", alignItems: "center", justifyContent: "center" },
  govBadgeText: { color: "#135C53", fontSize: 18, fontWeight: "900" },
  govCopy: { flex: 1 },
  govTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  govSubtitle: { color: COLORS.subtle, fontSize: 11, marginTop: 3 },
  createRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 22 },
  mutedText: { color: COLORS.muted, fontSize: 13 },
  privacyNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 22, marginBottom: 4 },
  privacyText: { color: COLORS.subtle, fontSize: 11 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 19, marginBottom: 1 },
  progressDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: COLORS.border },
  progressDotActive: { backgroundColor: COLORS.lime },
  progressLabel: { color: COLORS.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginLeft: 5 },
  helperText: { color: COLORS.subtle, fontSize: 11, lineHeight: 16, marginTop: -2, marginBottom: 17 },
  verificationIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#202A22", borderWidth: 1, borderColor: "#43552A", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  codeInput: { height: 64, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised, borderRadius: 17, color: COLORS.lime, fontSize: 28, fontWeight: "800", letterSpacing: 10, textAlign: "center", paddingLeft: 10, marginBottom: 16 },
  centerLink: { alignItems: "center", paddingTop: 19 },
  demoHint: { color: COLORS.subtle, fontSize: 11, textAlign: "center", marginTop: 17 },
  govHero: { alignItems: "flex-start", paddingTop: 31, paddingBottom: 24 },
  govLargeBadge: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#EBF3F2", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  govLargeBadgeText: { color: "#135C53", fontSize: 38, fontWeight: "900" },
  infoRow: { flexDirection: "row", gap: 13, paddingBottom: 20, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoCopy: { flex: 1 },
  infoTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800", marginBottom: 5 },
  infoText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },

  feedIntro: { paddingTop: 29, paddingBottom: 18 },
  profileAccess: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 17, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14 },
  profileAccessText: { color: COLORS.lime, fontSize: 12, fontWeight: "800" },
  profileLoading: { alignItems: "center", justifyContent: "center", paddingVertical: 42, gap: 15 },
  profileCard: { backgroundColor: COLORS.surface, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, padding: 20 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  profileAvatar: { width: 57, height: 57, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#202A22", borderWidth: 1, borderColor: "#43552A" },
  profileHeaderCopy: { flex: 1 },
  profileName: { color: COLORS.text, fontSize: 19, fontWeight: "800" },
  profileSeparator: { height: 1, backgroundColor: COLORS.border, marginVertical: 17 },
  profileLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 7 },
  profileValue: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  profileStatus: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  profileStatusText: { fontSize: 12, fontWeight: "700" },
  profileHint: { color: COLORS.muted, fontSize: 11, lineHeight: 17 },
  profileEditAction: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", borderWidth: 1, borderColor: "#43552A", backgroundColor: "#202A22", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, marginTop: 15 },
  profileEditActionText: { color: COLORS.lime, fontSize: 12, fontWeight: "800" },
  profileEditPanel: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 17, paddingTop: 17 },
  profileCancelAction: { alignItems: "center", padding: 12, marginTop: 7 },
  profileCancelText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  profileSecurityActions: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  profileSecurityTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 6 },
  feedStatusCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#172019", borderWidth: 1, borderColor: "#34452A", borderRadius: 18, padding: 13, marginBottom: 24 },
  feedStatusIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#243323", alignItems: "center", justifyContent: "center" },
  feedStatusCopy: { flex: 1 },
  feedStatusTitle: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  feedStatusText: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  feedStatusLive: { alignItems: "flex-end", gap: 4 },
  feedStatusLiveText: { color: COLORS.lime, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  feedStatusLiveTextWarning: { color: COLORS.amber },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionCount: { color: COLORS.subtle, fontSize: 11, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 15 },
  filterChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: COLORS.surface },
  filterChipActive: { borderColor: COLORS.lime, backgroundColor: "#27321D" },
  filterChipText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: COLORS.lime },
  mapCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 23, padding: 13, marginBottom: 17 },
  mapCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  mapTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginTop: 1 },
  gpsPill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#43552A", backgroundColor: "#202A22", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 6 },
  gpsDot: { width: 5, height: 5, borderRadius: 5, backgroundColor: COLORS.lime },
  gpsDotWarning: { backgroundColor: COLORS.amber },
  gpsPillText: { color: COLORS.lime, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  gpsPillTextWarning: { color: COLORS.amber },
  mapSurface: { height: 190, overflow: "hidden", borderRadius: 17, backgroundColor: "#18211E", position: "relative" },
  mapLine: { position: "absolute", backgroundColor: "#2A3933", opacity: 0.8 },
  mapLineHorizontalOne: { height: 1, left: -20, right: -20, top: "27%" },
  mapLineHorizontalTwo: { height: 1, left: -20, right: -20, top: "54%" },
  mapLineHorizontalThree: { height: 1, left: -20, right: -20, top: "77%" },
  mapLineVerticalOne: { width: 1, top: -20, bottom: -20, left: "21%" },
  mapLineVerticalTwo: { width: 1, top: -20, bottom: -20, left: "53%" },
  mapLineVerticalThree: { width: 1, top: -20, bottom: -20, left: "78%" },
  mapRoad: { position: "absolute", height: 7, backgroundColor: "#23302B", borderWidth: 1, borderColor: "#32423A", transform: [{ rotate: "-21deg" }] },
  mapRoadDiagonal: { width: "120%", left: "-9%", top: "52%" },
  mapMarker: { position: "absolute", alignItems: "center", gap: 3 },
  mapMarkerMuted: { opacity: 0.6 },
  mapMarkerCore: { width: 17, height: 17, borderRadius: 17, borderWidth: 4, borderColor: "#C8FF3D88", backgroundColor: COLORS.lime, shadowColor: COLORS.lime, shadowOpacity: 0.8, shadowRadius: 9, elevation: 4 },
  mapMarkerCoreMuted: { width: 14, height: 14, borderRadius: 14, borderWidth: 3, borderColor: "#F5C86A66", backgroundColor: COLORS.amber },
  mapMarkerLabel: { color: COLORS.text, fontSize: 9, fontWeight: "800", backgroundColor: "#101513CC", paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6 },
  mapYouAreHere: { position: "absolute", left: "47%", top: "42%", width: 27, height: 27, borderRadius: 27, borderWidth: 1, borderColor: "#8FD9C588", alignItems: "center", justifyContent: "center" },
  mapYouAreHereCore: { width: 9, height: 9, borderRadius: 9, backgroundColor: "#8FD9C5" },
  mapLegend: { flexDirection: "row", gap: 16, paddingTop: 11 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: COLORS.lime },
  legendYouDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: "#8FD9C5" },
  legendText: { color: COLORS.subtle, fontSize: 10 },
  alertList: { gap: 9, marginBottom: 16 },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 12 },
  alertAvatar: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  alertCopy: { flex: 1 },
  alertTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 7 },
  alertTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  alertDistance: { flexDirection: "row", alignItems: "center", gap: 3 },
  alertDistanceText: { color: COLORS.lime, fontSize: 10, fontWeight: "800" },
  alertMeta: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  alertCategory: { color: COLORS.subtle, fontSize: 9, fontWeight: "700", marginTop: 4 },
  alertFooter: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  alertFooterText: { color: COLORS.subtle, fontSize: 10 },
  alertStatus: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 5 },
  alertStatusDot: { width: 5, height: 5, borderRadius: 5, backgroundColor: COLORS.amber },
  alertStatusText: { color: COLORS.subtle, fontSize: 10 },
  emptyState: { alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 20, gap: 7 },
  emptyStateTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  emptyStateText: { color: COLORS.muted, fontSize: 11, textAlign: "center" },
  outlineAction: { minHeight: 55, borderWidth: 1, borderColor: "#43552A", borderRadius: 16, backgroundColor: "#182119", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 14 },
  outlineActionText: { color: COLORS.lime, fontSize: 12, fontWeight: "800", flex: 1 },
  disclaimer: { color: COLORS.subtle, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 13 },
  selectedCaseRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 10 },
  selectedCaseDot: { width: 9, height: 9, borderRadius: 9 },
  selectedCaseCopy: { flex: 1 },
  selectedCaseTitle: { color: COLORS.text, fontSize: 11, fontWeight: "800" },
  selectedCaseText: { color: COLORS.subtle, fontSize: 9, marginTop: 3 },
  bottomNav: { flexDirection: "row", backgroundColor: "#111614", borderWidth: 1, borderColor: COLORS.border, borderRadius: 19, padding: 5, marginTop: 24 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, minHeight: 51, borderRadius: 14 },
  navItemActive: { backgroundColor: "#25311F" },
  navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  navLabelActive: { color: COLORS.lime },
  webviewMock: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, overflow: "hidden", backgroundColor: "#111715", marginBottom: 16 },
  webviewTop: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 11, paddingVertical: 10 },
  webviewDots: { flexDirection: "row", gap: 3 },
  webviewDot: { width: 5, height: 5, borderRadius: 5, backgroundColor: COLORS.subtle },
  webviewTitle: { color: COLORS.subtle, fontSize: 9, flex: 1 },
  webviewBody: { alignItems: "center", padding: 19 },
  webviewBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#202A22", borderWidth: 1, borderColor: "#43552A", alignItems: "center", justifyContent: "center", marginBottom: 11 },
  webviewBodyTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  webviewBodyText: { color: COLORS.muted, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 7, maxWidth: 260 },
  webviewNotice: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 13, backgroundColor: "#252115", borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  webviewNoticeText: { color: COLORS.amber, fontSize: 9, fontWeight: "700" },
  ufRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  ufChip: { minWidth: 49, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 10, backgroundColor: COLORS.surfaceRaised },
  ufChipActive: { borderColor: COLORS.lime, backgroundColor: "#27321D" },
  ufChipText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  ufChipTextActive: { color: COLORS.lime },
  secondaryButton: { minHeight: 52, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, backgroundColor: COLORS.surfaceRaised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12, marginBottom: 15 },
  secondaryButtonActive: { borderColor: "#43552A", backgroundColor: "#202A22" },
  secondaryButtonText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  captureLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 2, marginBottom: 8 },
  captureActions: { flexDirection: "row", gap: 9, marginBottom: 12 },
  captureButton: { flex: 1, minHeight: 52, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, backgroundColor: COLORS.surfaceRaised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  captureButtonActive: { borderColor: COLORS.lime, backgroundColor: "#202A22" },
  captureButtonText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  documentPreview: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#43552A", borderRadius: 14, backgroundColor: "#202A22", padding: 9, marginBottom: 13 },
  documentPreviewImage: { width: 48, height: 48, borderRadius: 9, backgroundColor: COLORS.surfaceRaised },
  documentPreviewCopy: { flex: 1 },
  documentPreviewTitle: { color: COLORS.text, fontSize: 11, fontWeight: "800" },
  documentPreviewText: { color: COLORS.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  demoCapture: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#43552A", borderRadius: 14, backgroundColor: "#202A22", padding: 11, marginBottom: 13 },
  demoCaptureText: { color: COLORS.muted, flex: 1, fontSize: 10, lineHeight: 14 },
  locationCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.surfaceRaised, padding: 12, marginBottom: 17 },
  locationCardActive: { borderColor: "#43552A", backgroundColor: "#202A22" },
  locationIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#283323" },
  locationCopy: { flex: 1 },
  locationTitle: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  locationText: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 17 },
  checkbox: { width: 21, height: 21, borderWidth: 1, borderColor: COLORS.subtle, borderRadius: 7, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxChecked: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  checkboxText: { flex: 1, color: COLORS.muted, fontSize: 11, lineHeight: 16 },
  doneSummary: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#172019", borderRadius: 13, padding: 12, marginBottom: 16 },
  doneSummaryText: { flex: 1, color: COLORS.muted, fontSize: 11, lineHeight: 16 },

});
