import {
  Appearance,
  ColorSchemeName,
  Dimensions,
  ScaledSize,
  TextStyle,
} from "react-native";
import { StyleSheetStore, SelectorOptions } from "../src/style-sheet-store";

export class TestStyleSheetStore extends StyleSheetStore {
  getStyle(classNames: string, options?: SelectorOptions) {
    return this.createSelector(classNames, options)(this.getSnapshot());
  }

  getTestStyle(classNames: string, options?: SelectorOptions) {
    return [...this.createSelector(classNames, options)(this.getSnapshot())];
  }
}

describe("StyleSheetStore", () => {
  test("can retrieve a style", () => {
    const style = { color: "black" };
    const store = new TestStyleSheetStore({
      styles: {
        "text-black": style,
      },
    });

    expect(store.getTestStyle("text-black")).toEqual([style]);
  });

  test("can retrieve a multiple style", () => {
    const textStyle: TextStyle = { color: "black" };
    const fontStyle: TextStyle = { fontWeight: "400" };

    const store = new TestStyleSheetStore({
      styles: {
        "text-black": textStyle,
        "font-400": fontStyle,
      },
    });

    expect(store.getTestStyle("text-black font-400")).toEqual([
      textStyle,
      fontStyle,
    ]);
  });

  test("retrieving the same style will keep the same identity", () => {
    const store = new TestStyleSheetStore({
      styles: {
        "text-black": { color: "black" },
      },
    });

    expect(store.getStyle("text-black")).toBe(store.getStyle("text-black"));
  });

  test("can match media", () => {
    const store = new TestStyleSheetStore({
      styles: {
        "hover_text-black.0": { color: "black" },
      },
      media: {
        "hover_text-black": [[["pseudo-class", "hover"]]],
      },
    });

    expect(store.getTestStyle("hover:text-black")).toEqual([]);
    expect(store.getTestStyle("hover:text-black", { hover: true })).toEqual([
      { color: "black" },
    ]);
  });

  test("can react to changes in media", () => {
    const appearance = createTestAppearance();

    const store = new TestStyleSheetStore({
      styles: {
        "dark_text-black.0": { color: "black" },
      },
      media: {
        "dark_text-black": [[["media", "(prefers-color-scheme: dark)"]]],
      },
      appearance,
    });

    expect(store.getTestStyle("dark:text-black")).toEqual([]);
    appearance.change({ colorScheme: "dark" });
    expect(store.getTestStyle("dark:text-black")).toEqual([{ color: "black" }]);
    appearance.change({ colorScheme: "light" });
    expect(store.getTestStyle("dark:text-black")).toEqual([]);
  });

  test.only("will only update the media styles", () => {
    const staticText = { color: "white" };
    const mediaText = { color: "black" };

    const appearance = createTestAppearance();

    const store = new TestStyleSheetStore({
      styles: {
        "text-white": staticText,
        "dark_text-black.0": mediaText,
      },
      media: {
        "dark_text-black": [[["media", "(prefers-color-scheme: dark)"]]],
      },
      appearance,
    });

    expect(store.getTestStyle("text-white dark:text-black")).toEqual([
      staticText,
    ]);

    appearance.change({ colorScheme: "dark" });

    expect(store.getTestStyle("text-white dark:text-black")).toEqual([
      staticText,
      mediaText,
    ]);
  });

  /*

  test("replace me", () => {
    const dimensions = createTestDimensions();

    const styles = {
      container: {
        width: "100%",
      },
      "container.0": {
        maxWidth: 640,
      },
      "container.1": {
        maxWidth: 768,
      },
    };

    const store = new TestStyleSheetStore({
      styles,
      media: {
        container: [
          [["media", "(min-width: 640px)"]],
          [["media", "(min-width: 768px)"]],
        ],
      },
      dimensions,
    });

    const first = store.getTestStyle("container");
    expect(first[0]).toBe(styles.container);
    expect(first[1]).toBe(styles["container.0"]);

    dimensions.change({
      window: {
        fontScale: 2,
        height: 1334,
        scale: 2,
        width: 800,
      },
      screen: {
        fontScale: 2,
        height: 1334,
        scale: 2,
        width: 800,
      },
    });

    const second = store.getTestStyle("container");
    expect(second[0]).toBe(styles.container);
    expect(second[1]).toBe(styles["container.0"]);
    expect(second[2]).toBe(styles["container.1"]);
  });
});

describe("StyleSheetStore - preprocessed", () => {
  test("can retrieve a style", () => {
    const store = new TestStyleSheetStore({
      preprocessed: true,
    });

    const styles = store.getTestStyle("text-black");
    expect(styles).toEqual([{ $$css: true, "text-black": "text-black" }]);
  });

  test("can retrieve multiple styles", () => {
    const store = new TestStyleSheetStore({
      preprocessed: true,
    });

    const styles = store.getTestStyle("text-black font-bold");
    expect(styles).toEqual([
      { $$css: true, "text-black font-bold": "text-black font-bold" },
    ]);
  });

  test("retrieving the same style will keep the same identity", () => {
    const store = new TestStyleSheetStore({
      preprocessed: true,
    });

    expect(store.getStyle("text-black")).toBe(store.getStyle("text-black"));
  });

  test("can mix inline styles", () => {
    const store = new TestStyleSheetStore({
      preprocessed: true,
    });

    const styles = store.getTestStyle("text-black", {
      style: {
        color: "red",
      },
    });
    expect(styles).toEqual([
      { $$css: true, "text-black": "text-black" },
      { color: "red" },
    ]);
  });

  test("retrieving the same style with inline styles will keep the same identity", () => {
    const store = new TestStyleSheetStore({
      preprocessed: true,
    });

    const style = { color: "red" };
    const first = store.getStyle("text-black", { style });
    const second = store.getStyle("text-black", { style });

    expect(first).toBe(second);
  });
  */
});

// function createTestDimensions() {
//   const dimensions = {
//     get() {
//       return {
//         fontScale: 2,
//         height: 1334,
//         scale: 2,
//         width: 750,
//       };
//     },
//     set() {
//       return;
//     },
//     addEventListener(_: unknown, handler: unknown) {
//       this.change = handler;
//     },
//     removeEventListener() {
//       return;
//     },
//     change: {} as unknown,
//     changeWindowDimensions(window: unknown) {
//       if (typeof this.change === "function") {
//         this.change({ window, screen: window });
//       }
//     },
//   };

//   return dimensions as unknown as Dimensions & {
//     change: ({
//       window,
//       screen,
//     }: {
//       window: ScaledSize;
//       screen: ScaledSize;
//     }) => void;
//   };
// }

// function createTestAppearance() {
//   return {
//     removeChangeListener() {
//       return;
//     },
//     getColorScheme(): ColorSchemeName {
//       return "light";
//     },
//     change: {} as (preferences: Appearance.AppearancePreferences) => void,
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     addChangeListener(fn: any) {
//       this.change = fn;
//       return {
//         remove() {
//           return;
//         },
//       };
//     },
//   };
// }
