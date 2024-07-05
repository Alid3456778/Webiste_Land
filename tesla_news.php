<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="CSS/style_me.css" />
    <title>News blog</title>
  </head>
  <body>
    <nav>
      <h3>News lable</h3><div class="catogiri">
          <div class="catogir_style"><a href="index.php">Home</a></div>
          <div class="catogir_style"><a href="industry.php">Industry</a></div>
        <div class="catogir_style"><a href="bussines.php">Buddines</a></div>
        <div class="catogir_style"><a href="sports.php">Sports</a></div>
      </div>
      <div class="catogiri_button">Filter
        <div class="dropdown_content">
            <form method="get" action="" class="filter-form">
             <label><input type="checkbox" name="keywords[]" value="Tesla"> Tesla</label><br>
             <label><input type="checkbox" name="keywords[]" value="Apple"> Apple</label><br>
             <label><input type="checkbox" name="keywords[]" value="Microsoft"> Microsoft</label><br>
             <label><input type="checkbox" name="keywords[]" value="Google"> Google</label><br>
             <label><input type="checkbox" name="keywords[]" value="Amazon"> Amazon</label><br>
             <button type="submit" class="dropdown_submit">Search</button>
            </form>
         </div>
      </div>
        <div class="search_wala">
            <form action="" method="get">
                <input type="text" class="search_input" placeholder="Search">
                <button class="search_button">Search</button>
            </form>
        </div>
    </nav>
    <h2 class="latest_header">Tesla news</h2>

    <div class="latest_wala_news">

    <?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => "https://newsapi.org/v2/everything?q=tesla&from=2024-04-26&sortBy=publishedAt&apiKey=a1770d7c67ea44a6b8e7d231a78d7db0",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => "",
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => "GET",
    CURLOPT_HTTPHEADER => [
        "User-Agent: MyApp/1.0",
    ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
    echo "cURL Error #:" . $err;
} else {
    // echo $response;
    $data = json_decode($response, true);
    $count=1;
    if (isset($data['articles']) && is_array($data['articles'])) {
    
        foreach ($data['articles'] as $article) {
            if ($count >= 15) break; 
            
            echo "<div class='container'>";
            echo "<img src='" . htmlspecialchars($article['urlToImage']) . "' alt='Thumbnail' class=image_of_text><br><br>";
            echo "<div class='title_of_text'>Title: " . htmlspecialchars($article['title']) . "</div><br>";
            echo "<div class='description_of_text'>Description: " . htmlspecialchars($article['description']) . "</div><br>";
            echo "<div class='url_of_text'>URL: <a href='" . htmlspecialchars($article['url']) . "'>" . htmlspecialchars($article['url']) . "</a></div><br>";
            echo "</div><br><br>";
            $count++;
        }
    } else {
        echo "No articles found or unexpected response format.";
    }
}
?>
    </div>
  </body>
</html>









