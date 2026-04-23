package com.steamactu.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class NotificationChannelModule extends ReactContextBaseJavaModule {

    public NotificationChannelModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "NotificationChannelModule";
    }

    @ReactMethod
    public void createChannel(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Context context = getReactApplicationContext();
                NotificationManager notificationManager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

                NotificationChannel channel = new NotificationChannel(
                    "steam_news",
                    "Game News",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notifications d'actualités sur vos jeux suivis");
                channel.enableLights(true);
                channel.enableVibration(true);

                notificationManager.createNotificationChannel(channel);
                promise.resolve("Canal créé avec succès");
            } else {
                promise.resolve("Pas besoin de canal (Android < 8.0)");
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Erreur création canal: " + e.getMessage());
        }
    }
}
