<?php
/**
 * Plugin Name: Kumatori Allow Script Tags
 * Description: 管理者がREST API経由でscriptタグを含むHTMLを投稿できるようにする
 * Version: 1.0
 * Author: 熊取つーしん
 */

// 管理者に unfiltered_html 権限を付与（シングルサイト限定）
add_action('init', function() {
    if (!is_multisite()) {
        $role = get_role('administrator');
        if ($role && !$role->has_cap('unfiltered_html')) {
            $role->add_cap('unfiltered_html');
        }
    }
});
