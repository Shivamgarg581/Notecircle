# Keep generic type information used by Retrofit and Gson.
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses,EnclosingMethod

# Retrofit service interfaces and their method annotations are inspected at runtime.
-keep interface app.notecircle.data.api.** { *; }
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }

# Preserve model fields used for JSON serialization/deserialization.
-keep class app.notecircle.data.model.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Preserve Kotlin metadata used by reflection-based libraries.
-keep class kotlin.Metadata { *; }
