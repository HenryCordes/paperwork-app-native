import { Alert } from "react-native";

type ToastType = "error" | "success";

export function useToast() {
  const showToast = (message: string, type: ToastType = "error") => {
    Alert.alert(type === "error" ? "Fout" : "Gelukt", message);
  };

  return { showToast };
}
