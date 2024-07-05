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
          <div class="catogir_style"><a href="tesla_news.php">Tesla</a></div>
          <div class="catogir_style"><a href="industry.php">Industry</a></div>
        <div class="catogir_style"><a href="index.php">Home</a></div>
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
    <h2 class="latest_header">Bussines news</h2>

    <div class="latest_wala_news">

    <?php
    //search Button 
    $keyword="bussines";

      
            searchAndDisplayArticles($keyword);
       
    

    function searchAndDisplayArticles($keyword) {
        function fetch_api_data($url, $headers = []) {
            $curl = curl_init();

            curl_setopt_array($curl, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "GET",
                CURLOPT_HTTPHEADER => $headers,
            ]);

            $response = curl_exec($curl);
            $err = curl_error($curl);

            curl_close($curl);

            if ($err) {
                echo "cURL Error #:" . $err;
                return null;
            } else {
                return json_decode($response, true);
            }
        }

        $newsApiUrl = "https://newsapi.org/v2/everything?q=$keyword&apiKey=a1770d7c67ea44a6b8e7d231a78d7db0";
        $newsApiHeaders = ["User-Agent: MyApp/1.0"];
        $count = 1;
        $newsData = fetch_api_data($newsApiUrl, $newsApiHeaders);

        if ($newsData && isset($newsData['articles']) && is_array($newsData['articles']) && count($newsData['articles']) > 0) {
            // echo "<h2 class='latest_header'>$keyword</h2>";
            echo "<div class='latest_wala_news'>";
            foreach ($newsData['articles'] as $article) {
                echo "<div class='container'>";
                if ($count >= 5) break;
                if (isset($article['urlToImage']) && $article['urlToImage'] !== null) {
                    echo "<img src='" . $article['urlToImage'] . "' alt='Thumbnail' class='image_of_text'><br><br>";
                }
                if (isset($article['title'])) {
                    echo "<div class='title_of_text'>Title: " . $article['title'] . "</div>";
                }
                if (isset($article['description'])) {
                    echo "<div class='description_of_text'>Description: " . $article['description'] . "</div>";
                }
                if (isset($article['url'])) {
                    echo "<div class='url_of_text'><a href='" . $article['url'] . "' target='_blank'>Read more</a></div>";
                }
                $count++;
                echo "</div>";
            }
            echo "</div>";
        } else {
            echo "<div class='container error-message'>No articles found or unexpected response format from NewsAPI.</div>";
        }
    }
    ?>
    </div>
  </body>
</html>









