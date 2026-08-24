package com.bodybank.app;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia.VisualMediaType;
import androidx.annotation.Nullable;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.Logger;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    /**
     * Upper bound for a multi-select photo-picker launch. No file input in the web app
     * currently sets `multiple`, but the WebView can still ask for MODE_OPEN_MULTIPLE.
     */
    private static final int MAX_PICKED_ITEMS = 10;

    private static final Set<String> IMAGE_EXTENSIONS = new HashSet<>(
        Arrays.asList(".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic", ".heif", ".avif")
    );
    private static final Set<String> VIDEO_EXTENSIONS = new HashSet<>(
        Arrays.asList(".mp4", ".mov", ".m4v", ".webm", ".mkv", ".3gp", ".avi")
    );

    /** The pending file-input callback while a picker is on screen. */
    @Nullable
    private ValueCallback<Uri[]> pendingPickerCallback;

    private ActivityResultLauncher<PickVisualMediaRequest> pickSingleMedia;
    private ActivityResultLauncher<PickVisualMediaRequest> pickMultipleMedia;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Registered here (before the activity is STARTED, as the Activity Result API
        // requires) so both launchers survive configuration changes and process death.
        pickSingleMedia = registerForActivityResult(
            new ActivityResultContracts.PickVisualMedia(),
            uri -> deliverPickedMedia(uri == null ? null : new Uri[] { uri })
        );
        pickMultipleMedia = registerForActivityResult(
            new ActivityResultContracts.PickMultipleVisualMedia(MAX_PICKED_ITEMS),
            uris -> deliverPickedMedia((uris == null || uris.isEmpty()) ? null : uris.toArray(new Uri[0]))
        );

        bridge
            .getWebView()
            .setWebChromeClient(
                new BridgeWebChromeClient(bridge) {
                    @Override
                    public void onPermissionRequest(PermissionRequest request) {
                        // Auto-grant camera / microphone permissions when web content requests
                        // them via navigator.mediaDevices.getUserMedia (e.g. the AI Trainer
                        // live-camera flow). Without this override the WebView silently
                        // denies, and the page falls through to its "Allow camera in browser
                        // settings" error - which is misleading inside an app.
                        //
                        // The Android runtime permission (declared in AndroidManifest) is
                        // still requested by the system the first time the camera is used,
                        // so the end user remains in control.
                        request.grant(request.getResources());
                    }

                    @Override
                    public boolean onShowFileChooser(
                        WebView webView,
                        ValueCallback<Uri[]> filePathCallback,
                        FileChooserParams fileChooserParams
                    ) {
                        // Photo/video-only inputs go through the Android photo picker, which
                        // needs no READ_MEDIA_* permission - a requirement of Google Play's
                        // Photo and Video Permissions policy. Everything else (camera capture,
                        // PDFs, zip/csv imports, untyped inputs) keeps Capacitor's own
                        // handling, which uses the system document picker and is likewise
                        // permission-free.
                        if (launchPhotoPicker(filePathCallback, fileChooserParams)) {
                            return true;
                        }
                        return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                    }
                }
            );
    }

    /**
     * Launches the Android photo picker for a media-only file input.
     *
     * @return true when the picker was launched and now owns the callback; false when the
     *         caller should fall back to Capacitor's default file chooser.
     */
    private boolean launchPhotoPicker(
        ValueCallback<Uri[]> filePathCallback,
        WebChromeClient.FileChooserParams fileChooserParams
    ) {
        // `capture` means the page asked for the camera, not the library.
        if (fileChooserParams.isCaptureEnabled()) {
            return false;
        }

        VisualMediaType mediaType = visualMediaTypeFor(fileChooserParams.getAcceptTypes());
        if (mediaType == null) {
            return false;
        }

        // A picker still pending when a new one is requested would strand the old input in
        // a waiting state; release it with a cancel first.
        deliverPickedMedia(null);
        pendingPickerCallback = filePathCallback;

        PickVisualMediaRequest request = new PickVisualMediaRequest.Builder().setMediaType(mediaType).build();
        try {
            if (fileChooserParams.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
                pickMultipleMedia.launch(request);
            } else {
                pickSingleMedia.launch(request);
            }
            return true;
        } catch (Exception ex) {
            pendingPickerCallback = null;
            Logger.warn(Logger.tags("FileChooser"), "Photo picker could not be launched: " + ex.getMessage());
            return false;
        }
    }

    /** Hands the picked URIs - or null, meaning cancelled - back to the waiting web input. */
    private void deliverPickedMedia(@Nullable Uri[] uris) {
        ValueCallback<Uri[]> callback = pendingPickerCallback;
        pendingPickerCallback = null;
        if (callback != null) {
            callback.onReceiveValue(uris);
        }
    }

    /**
     * Maps a file input's accept list onto a photo-picker media type.
     *
     * @return null when the input accepts anything the photo picker cannot serve - a PDF,
     *         an archive, or no accept list at all - so those keep the document picker.
     */
    @Nullable
    private static VisualMediaType visualMediaTypeFor(@Nullable String[] acceptTypes) {
        if (acceptTypes == null) {
            return null;
        }

        boolean images = false;
        boolean videos = false;

        for (String rawAccept : acceptTypes) {
            if (rawAccept == null) {
                continue;
            }
            // getAcceptTypes() usually splits on commas already; some WebView builds hand
            // back the raw attribute, so split defensively.
            for (String part : rawAccept.split(",")) {
                String accept = part.trim().toLowerCase(Locale.US);
                if (accept.isEmpty()) {
                    continue;
                }
                if (accept.startsWith("image/") || IMAGE_EXTENSIONS.contains(accept)) {
                    images = true;
                } else if (accept.startsWith("video/") || VIDEO_EXTENSIONS.contains(accept)) {
                    videos = true;
                } else {
                    return null;
                }
            }
        }

        if (images && videos) {
            return ActivityResultContracts.PickVisualMedia.ImageAndVideo.INSTANCE;
        }
        if (images) {
            return ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE;
        }
        if (videos) {
            return ActivityResultContracts.PickVisualMedia.VideoOnly.INSTANCE;
        }
        return null;
    }
}
