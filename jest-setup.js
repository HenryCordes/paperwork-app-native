require("react-native-gesture-handler/jestSetup");

// expo-router/testing-library auto-mocks react-native-reanimated with
// react-native-reanimated/mock (see node_modules/expo-router/build/
// testing-library/mocks.js), but that mock module itself imports the real
// react-native-reanimated/src/index, which in turn requires the native
// react-native-worklets bridge. Under Jest that native bridge isn't
// available, the import throws, and expo-router's mock factory silently
// swallows the error and falls back to `{}` (see the try/catch around
// `require('react-native-reanimated/mock')` in mocks.js) -- which is why
// `useSharedValue` ends up undefined. Mocking react-native-worklets first
// lets reanimated's real module (and therefore its mock) load successfully.
// https://docs.swmansion.com/react-native-worklets/docs/guides/testing/
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock")
);
