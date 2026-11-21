package com.personallearningos.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        super.load();
        // Next export has one HTML file per route. Capacitor's SPA fallback would
        // otherwise return the dashboard HTML when /sync/ or /tasks/ is reloaded.
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String path = url.getPath();
                if ("localhost".equals(url.getHost()) && path != null && !path.contains(".") && !path.contains("..")) {
                    final Uri mapped = url.buildUpon().path(path.endsWith("/") ? path + "index.html" : path + "/index.html").build();
                    return super.shouldInterceptRequest(view, new WebResourceRequest() {
                        public Uri getUrl() { return mapped; }
                        public boolean isForMainFrame() { return request.isForMainFrame(); }
                        public boolean isRedirect() { return request.isRedirect(); }
                        public boolean hasGesture() { return request.hasGesture(); }
                        public String getMethod() { return request.getMethod(); }
                        public Map<String, String> getRequestHeaders() { return request.getRequestHeaders(); }
                    });
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
    }
}
