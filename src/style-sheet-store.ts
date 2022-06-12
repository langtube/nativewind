import {
  Dimensions,
  Appearance,
  ScaledSize,
  ColorSchemeName,
  EmitterSubscription,
  NativeEventSubscription,
  TextStyle,
  ImageStyle,
  ViewStyle,
  Platform,
  StyleProp,
} from "react-native";
import { matchAtRule } from "./match-at-rule";
import { normalizeSelector } from "./shared/selector";
import { MediaRecord } from "./types/common";
import vh from "./units/vh";
import vw from "./units/vw";

type Style = ViewStyle | ImageStyle | TextStyle;
type InlineStyle<T extends Style> = T;
type AtRuleStyle<T extends Style> = T & { atRules: unknown[] };
type CompiledStyle = { [key: string]: string } & { $$css: boolean };
type EitherStyle<T extends Style = Style> =
  | AtRuleStyle<T>
  | CompiledStyle
  | InlineStyle<T>
  | StyleProp<T>;

export type Snapshot = Record<string, StylesArray>;
export type MatchAtRule = (options: SelectorOptions) => boolean | undefined;

export interface StylesArray<T = Style> extends Array<EitherStyle<T>> {
  dynamic?: boolean;
  isForChildren?: boolean;
  childStyles?: StylesArray;
  currentRef?: Record<string, unknown>;
}

export interface SelectorOptions {
  hover?: boolean;
  active?: boolean;
  focus?: boolean;
  componentHover?: boolean;
  componentActive?: boolean;
  componentFocus?: boolean;
}

const units: Record<
  string,
  (value: string | number) => string | number | Record<string, unknown>
> = {
  vw,
  vh,
};

export class StyleSheetStore {
  snapshot: Snapshot = {};
  listeners = new Set<() => void>();
  mediaListeners = new Map<string, Set<() => void>>();

  dimensionListener: EmitterSubscription;
  appearanceListener: NativeEventSubscription;

  styles: Record<string, Style>;
  media: MediaRecord;
  preprocessed: boolean;

  platform: typeof Platform.OS;
  window: ScaledSize;
  colorScheme: ColorSchemeName;
  orientation: OrientationLockType;

  constructor({
    styles = global.tailwindcss_react_native_style,
    media = global.tailwindcss_react_native_media || [],
    dimensions = Dimensions,
    appearance = Appearance,
    platform = Platform.OS,
    preprocessed = false,
  } = {}) {
    this.platform = platform;
    this.styles = styles;
    this.media = media;
    this.preprocessed = preprocessed;
    this.window = dimensions.get("window");
    this.colorScheme = Appearance.getColorScheme();

    const screen = dimensions.get("screen");
    this.orientation = screen.height >= screen.width ? "portrait" : "landscape";

    this.dimensionListener = dimensions.addEventListener(
      "change",
      ({ window, screen }) => {
        this.window = window;
        this.orientation =
          screen.height >= screen.width ? "portrait" : "landscape";

        for (const l of this.mediaListeners.get("window") || []) l();
        this.notify();
      }
    );

    this.appearanceListener = appearance.addChangeListener(
      ({ colorScheme }) => {
        this.colorScheme = colorScheme;
        for (const l of this.mediaListeners.get("colorScheme") || []) l();
        this.notify();
      }
    );
  }

  destroy() {
    this.dimensionListener.remove();
    this.appearanceListener.remove();
  }

  notify() {
    for (const l of this.listeners) l();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return this.snapshot;
  }

  getServerSnapshot() {
    return this.snapshot;
  }

  getKey(
    className: string,
    {
      hover = false,
      active = false,
      focus = false,
      componentHover = false,
      componentActive = false,
      componentFocus = false,
    }: SelectorOptions = {}
  ) {
    return this.preprocessed
      ? className
      : `${className}.${+hover}${+active}${+focus}${+componentHover}${+componentActive}${+componentFocus}`;
  }

  createSelector<T>(
    className: string,
    options: SelectorOptions = {}
  ): (snapshot: Snapshot) => StylesArray {
    const key = this.getKey(className, options);

    // This is the first time we are requesting this className combination
    // so we need to add it to the snapshot and add the media subscriptions
    if (!this.snapshot[key]) {
      if (this.preprocessed) {
        const styleArray: StylesArray = [
          { $$css: true, [key]: key } as CompiledStyle,
        ];
        styleArray.dynamic = false;
        this.snapshot = { [key]: styleArray, ...this.snapshot };
      } else {
        // function reEvaluate() {
        //   const styleArray: StylesArray<T> = [];
        //   let isDynamic = false;
        //   for (const name of className.split(/\s+/)) {
        //     const classNameStyles = this.upsertAtomicStyle(name, options);
        //     if (classNameStyles.dynamic) {
        //       isDynamic = true;
        //     }
        //     styleArray.push(...(classNameStyles as StylesArray<T>));
        //   }
        //   styleArray.dynamic = isDynamic;
        //   this.snapshot = { [key]: styleArray, ...this.snapshot };
        // }
        // reEvaluate();
      }
    }

    return (snapshot: Snapshot) => {
      return snapshot[key];
    };
  }

  isEqual(a: StylesArray, b: StylesArray): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((style, index) => Object.is(style, b[index]));
  }

  /**
   * ClassNames are made of multiple atomic styles. eg "a b" are the styles [a, b]
   *
   * This function will be called for each atomic style
   */
  upsertAtomicStyle(
    className: string,
    options: SelectorOptions = {}
  ): StylesArray {
    const key = this.getKey(className, options);
    const normalizeClassName = normalizeSelector(className);

    // This atomic style has already been processed, we can skip it
    if (this.snapshot[key]) return this.snapshot[key];

    // To keep things consistent, even atomic styles are arrays
    const styleArray: StylesArray = this.styles[normalizeClassName]
      ? [this.styles[normalizeClassName]]
      : [];

    const media = this.media[normalizeClassName];

    // If there is no media, this style is static.
    // We can add it to the snapshot and early exit.
    if (!media) {
      styleArray.dynamic = false;
      this.snapshot = { [key]: styleArray, ...this.snapshot };
      return styleArray;
    }

    // These are the media topics the atomic style has subscribed to.
    // They may be things like window, window.width, orientation, colorScheme, etc
    const topics = new Set<string>();

    // When a topic has new information, this function will be called.
    // Its purpose is to compute
    const reEvaluate = () => {
      const childStyles: StylesArray = [];

      const newStyles: StylesArray = [...styleArray];
      newStyles.dynamic = true;

      for (const [index, atRules] of media.entries()) {
        let isForChildren = false;
        let unitKey: string | undefined;

        const atRulesResult = atRules.every(([rule, params]) => {
          /**
           * This is a magic string, but it makes sense
           * Child selectors look like this and will always start with (>
           *
           * @selector (> *:not(:first-child))
           * @selector (> *)
           */
          if (rule === "selector" && params && params.startsWith("(>")) {
            isForChildren = true;
            return true;
          }

          if (rule === "dynamic-style") {
            if (unitKey) {
              throw new Error("cannot have multiple unit keys");
            }

            unitKey = params;
            return true;
          }

          return matchAtRule({
            rule,
            params,
            platform: this.platform,
            width: this.window.width,
            height: this.window.height,
            colorScheme: this.colorScheme,
            orientation: this.orientation,
            ...options,
          });
        });

        const style = this.styles[`${normalizeClassName}.${index}`];

        if (unitKey) {
          for (const [key, value] of Object.entries(style)) {
            (style as Record<string, unknown>)[key] = units[unitKey](value);
          }
        }

        if (atRulesResult) {
          if (isForChildren) {
            childStyles.push({ ...style, atRules });
          } else {
            newStyles.push(style);
          }
        }
      }

      if (childStyles.length > 0) {
        newStyles.childStyles = childStyles;
      }

      const existingStyles = this.snapshot[key];

      if (!existingStyles) {
        this.snapshot[key] = newStyles;
        return newStyles;
      }

      if (this.isEqual(existingStyles, newStyles)) {
        return existingStyles;
      }

      // An existing style has changed, so create a new snapshot - this will cause
      this.snapshot = { ...this.snapshot, [key]: newStyles };
      return newStyles;
    };

    // Loop over the media and either subscribe to topics
    // or create matchAtRule functions
    for (const [[atRule, params]] of media) {
      if (atRule === "media" && params) {
        if (params.includes("width")) topics.add("window");
        if (params.includes("height")) topics.add("window");
        if (params.includes("orientation")) topics.add("window");
        if (params.includes("aspect-ratio")) topics.add("window");
        if (params.includes("prefers-color-scheme")) topics.add("colorScheme");
      }
    }

    for (const topic of topics.values()) {
      this.subscribeMedia(topic, () => reEvaluate());
    }

    return reEvaluate() || [];
  }

  subscribeMedia(topic: string, listener: () => void) {
    let listeners = this.mediaListeners.get(topic);
    if (!listeners) {
      listeners = new Set();
      this.mediaListeners.set(topic, listeners);
    }

    listeners.add(listener);
  }
}
