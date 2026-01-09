#!/usr/local/bin/perl

#┌─────────────────────────────────
#│ WEB PATIO : archive.cgi - 2026/01/10
#│ Memory Box (Log Archiver)
#│ copyright (c) kentweb, 1997-2022
#│ Modified by sanada (Antigravity)
#└─────────────────────────────────

use strict;
use CGI::Carp qw(fatalsToBrowser);
use lib "./lib";
use CGI::Minimal;
use IO::Compress::Zip qw(zip $ZipError);

# 設定ファイル認識
require "./init.cgi";
my %cf = set_init();

# データ受理
CGI::Minimal::max_read_size($cf{maxdata});
my $cgi = CGI::Minimal->new;
error('容量オーバー') if ($cgi->truncated);
my %in = parse_form($cgi);

# メイン処理
if ($in{no}) {
    download_archive($in{no});
} else {
    error("スレッド番号が指定されていません");
}

# エラー処理
sub error {
    my $err = shift;
    print "Content-type: text/html; charset=utf-8\n\n";
    print "<html><body><h3>ERROR: $err</h3></body></html>";
    exit;
}

# フォームデコード
sub parse_form {
    my $cgi = shift;
    my %in;
    foreach ( $cgi->param() ) {
        my $val = $cgi->param($_);
        $val =~ s/&/&amp;/g;
        $val =~ s/</&lt;/g;
        $val =~ s/>/&gt;/g;
        $val =~ s/"/&quot;/g;
        $val =~ s/'/&#39;/g;
        $in{$_} = $val;
    }
    return %in;
}

# アーカイブ作成・ダウンロード
sub download_archive {
    my $no = shift;
    $no =~ s/\D//g;

    my $logfile = "$cf{datadir}/log/$no.cgi";
    if (!-e $logfile) {
        error("指定されたスレッドが見つかりません");
    }

    # ログ読み込み
    open(IN, $logfile) or error("ログファイルが開けません");
    my $top = <IN>; # 親記事ヘッダ
    my $par = <IN>; # 親記事本文
    my @lines = <IN>; # レス
    close(IN);

    # スレッド情報取得
    my ($p_no, $p_sub, $p_res, $p_key) = split(/<>/, $top);
    
    # 画像ファイル収集用
    my %images_to_add;

    # HTML生成開始
    my $html_content = generate_html_header($p_sub);
    
    # 親記事処理
    $html_content .= process_post($par, 'starter', \%images_to_add);

    # レス記事処理
    foreach my $line (@lines) {
        $html_content .= process_post($line, 'reply', \%images_to_add);
    }

    $html_content .= generate_html_footer();

    # ZIP作成・出力
    print "Content-Type: application/zip\n";
    print "Content-Disposition: attachment; filename=thread_$no.zip\n\n";

    # STDOUTに出力するためにファイルハンドル作成 (IO::String的なものが必要だが、直接STDOUTへ)
    # IO::Compress::Zip は出力先に '-' (STDOUT) を指定可能
    my $z = new IO::Compress::Zip '-' 
        or die "zip failed: $ZipError\n";

    # index.html 追加
    $z->addData($html_content, "index.html");

    # 画像ファイル追加
    foreach my $img_path (keys %images_to_add) {
        my $zip_path = $images_to_add{$img_path};
        if (-e $img_path) {
            $z->addFile($img_path, $zip_path);
        }
    }

    # CSSファイル追加 (直下の style.css を読み込んで追加)
    # テーマごとのCSSを統合するのは大変なので、今は style.css を標準とする
    if (-e "$cf{cmnurl}/style.css") {
        $z->addFile("$cf{cmnurl}/style.css", "style.css");
    }
    # 他のテーマCSSも念のため同梱
    if (-e "$cf{cmnurl}/style_simple.css") {
        $z->addFile("$cf{cmnurl}/style_simple.css", "style_simple.css");
    }
    if (-e "$cf{cmnurl}/style_gloomy.css") {
        $z->addFile("$cf{cmnurl}/style_gloomy.css", "style_gloomy.css");
    }
    
    # アイコン等 (最低限)
    # images/ フォルダを作りそこにアイコンを入れるか、HTML内で Base64 にするか？
    # 今回は簡略化のため、オンラインの画像リンクはオフラインでは切れることを許容する
    # ただし、添付画像は重要なので include する

    $z->close();
    exit;
}

# 記事HTML生成
sub process_post {
    my ($line, $type, $img_ref) = @_;
    my ($no, $sub, $nam, $eml, $com, $date, $ho, $pw, $url, $mlo, $myid, $tim, $up1, $up2, $up3) = split(/<>/, $line);

    # コメントデコード
    $com =~ s/&lt;br&gt;/<br>/g;
    $com =~ s/&lt;br \/&gt;/<br>/g;

    # 画像処理
    my $img_html = "";
    foreach my $up ($up1, $up2, $up3) {
        if ($up) {
            my ($ext, $orig) = split(/,/, $up);
            my $n = ($up eq $up1) ? 1 : ($up eq $up2) ? 2 : 3;
            my $src_file = "$cf{upldir}/$tim-$n$ext";
            my $zip_path = "images/$tim-$n$ext";
            
            # ZIPに追加リストへ
            $img_ref->{$src_file} = $zip_path;
            
            # HTML埋め込み
            $img_html .= qq|<div class="art-img"><a href="$zip_path" target="_blank"><img src="$zip_path" style="max-width:300px;"></a></div>|;
        }
    }

    my $class = ($type eq 'starter') ? "post starter" : "post reply";

    return <<HTML;
<div class="$class" id="post-$no">
    <div class="art-meta">
        <div><b>投稿者</b>： $nam</div>
        <div><b>投稿日</b>： $date</div>
        <div>$sub</div>
    </div>
    <div class="comment">
        $img_html
        $com
    </div>
</div>
HTML
}

sub generate_html_header {
    my $title = shift;
    return <<HTML;
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$title - Memory Box</title>
<link rel="stylesheet" href="style.css">
<style>
body { max-width: 900px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.post { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
.starter { border-left: 5px solid #ff4757; }
.reply { margin-left: 20px; border-left: 3px solid #ccc; }
.art-meta { color: #666; font-size: 0.9em; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #eee; }
.comment { line-height: 1.6; }
.art-img { margin: 10px 0; }
</style>
</head>
<body>
<h1>$title</h1>
<p style="text-align:right; font-size:0.8em; color:#999;">Exported by Memory Box</p>
<hr>
HTML
}

sub generate_html_footer {
    return <<HTML;
<hr>
<p style="text-align:center; color:#ccc; font-size:0.8em;">&copy; LetterBBS Archive</p>
</body>
</html>
HTML
}
