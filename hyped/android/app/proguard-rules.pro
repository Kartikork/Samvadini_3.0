# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:


```proguard
# Firebase
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-keep class com.google.firebase.** { *; }

# Security module - keep for runtime checks
-keep class com.friendsV.security.** { *; }
-keepclassmembers class com.friendsV.security.** { *; }

# Obfuscate security class names but keep functionality
-keep,allowobfuscation class com.friendsV.security.SecurityManager { *; }
-keep,allowobfuscation class com.friendsV.security.SecurityModule { *; }
-keep class com.google.android.gms.** { *; }

# Notifee
-keep class app.notifee.** { *; }
-keep class androidx.core.app.NotificationCompat* { *; }
```