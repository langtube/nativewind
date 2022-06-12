import { useContext, useMemo } from "react";
import { StyleProp } from "react-native";
import { StoreContext } from "./context/store-context";
import { SelectorOptions } from "./style-sheet-store";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";

export function useTailwind<T>(
  classNames: string,
  options: SelectorOptions = {},
  inlineStyles?: StyleProp<T>
) {
  const store = useContext(StoreContext);

  // While normally the selector doesn't need to be stable
  // useSyncExternalStoreWithSelector does require it
  const selector = useMemo(
    () => store.createSelector(classNames, options),
    [
      store,
      classNames,
      options.hover,
      options.focus,
      options.active,
      options.componentHover,
      options.componentFocus,
      options.componentActive,
    ]
  );

  const styles = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
    selector,
    store.isEqual
  );

  return useMemo(
    () => (inlineStyles ? [...styles, inlineStyles] : styles),
    [styles, inlineStyles]
  );
}
