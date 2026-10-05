# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---- 대똥단결 release (R8) ----
# Crash stack traces stay readable with the uploaded mapping file
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*,Exceptions
-renamesourcefileattribute SourceFile

# App entry points
-keep class com.toiletshare.app.** { *; }

# Capacitor bridge + plugins (bridge resolves plugin classes/methods by reflection)
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class io.capawesome.capacitorjs.plugins.** { *; }
-keep class com.codetrixstudio.capacitor.** { *; }
-keep class com.lepisode.capacitor.** { *; }
-keep class com.nerdfrenz.kakao.** { *; }
-keep class com.transistorsoft.** { *; }
-keep class org.apache.cordova.** { *; }

# Social login SDKs (Gson/Retrofit models, reflection)
-keep class com.kakao.sdk.** { *; }
-keep class com.navercorp.nid.** { *; }
-keep class com.nhn.android.naverlogin.** { *; }
-dontwarn com.kakao.sdk.**
-dontwarn com.navercorp.nid.**

# WebView JS bridges
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# OkHttp optional TLS providers (not bundled)
-dontwarn org.bouncycastle.jsse.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**

# Retrofit / OkHttp / Gson used by Kakao & Naver SDKs (R8 full mode strips generic signatures otherwise)
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,AnnotationDefault
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * { @com.google.gson.annotations.SerializedName <fields>; }
-dontwarn retrofit2.**
-dontwarn okhttp3.**
-dontwarn okio.**
