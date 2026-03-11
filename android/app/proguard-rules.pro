# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ─── React Native Reanimated ──────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ─── FinTrack Custom Native Modules ──────────────────────────────────────────
# CRITICAL: R8 strips these in release builds because they are only referenced
# by string via the React Native bridge — not by direct Java class reference.
# Without these rules SmsModule becomes undefined in JS and returns [] silently.
-keep class com.fintrack.FinTrack.** { *; }
-keepclassmembers class com.fintrack.FinTrack.** { *; }

# ─── React Native Bridge ──────────────────────────────────────────────────────
-keep @com.facebook.react.bridge.ReactModule class * { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
-keep class * implements com.facebook.react.ReactPackage { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    public java.lang.String getName();
}
-keep class com.facebook.react.bridge.ReactApplicationContext { *; }
-keep class com.facebook.react.bridge.NativeModule { *; }

# Keep annotations so @ReactMethod and @ReactModule survive minification
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ─── Hermes JS Engine ─────────────────────────────────────────────────────────
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ─── Expo Modules ─────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }