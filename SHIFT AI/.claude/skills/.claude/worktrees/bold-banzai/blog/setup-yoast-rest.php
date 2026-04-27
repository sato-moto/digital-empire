<?php
/**
 * Plugin Name: Kumatori Yoast REST API Bridge
 * Description: Yoast SEOのメタフィールドをREST APIから読み書き可能にする
 * Version: 1.0
 * Author: kumatori-info
 */

// Yoast SEOのメタフィールドをREST APIに登録
add_action('init', function() {
    $meta_fields = [
        '_yoast_wpseo_title'    => 'Yoast SEO Title',
        '_yoast_wpseo_metadesc' => 'Yoast Meta Description',
        '_yoast_wpseo_focuskw'  => 'Yoast Focus Keyword',
    ];

    foreach ($meta_fields as $meta_key => $description) {
        register_post_meta('post', $meta_key, [
            'show_in_rest'  => true,
            'single'        => true,
            'type'          => 'string',
            'description'   => $description,
            'auth_callback' => function() {
                return current_user_can('edit_posts');
            }
        ]);
    }
});
