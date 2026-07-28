# React Native core — reflection-based bridge must not be stripped or renamed
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# Keep JavaScript interface annotations used by the bridge
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# Keep source file names and line numbers in stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Suppress notes about missing classes in third-party libraries
-dontnote com.facebook.**
-dontnote expo.**
