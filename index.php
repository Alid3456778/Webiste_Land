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
      <h3>News lable</h3>
      <div class="catogiri">
        <div class="catogir_style"><a href="tesla_news.php" >Tesla</a></div>
        <div class="catogir_style"><a href="industry.php">Industry</a></div>
        <div class="catogir_style"><a href="bussines.php">Bussines</a></div>
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
             <button type="submit" class="dropdown_submit">Apply</button>
            </form>
         </div>
      </div>
        <div class="search_wala">
            <form action="" method="get" class="form_wala">
                <input type="text" class="search_input" placeholder="Search" id="keyworddds" name="keyword">
                
                <button class="search_button">Search</button>
            </form>
        </div>
        
    </nav>

    <?php
    //filter
    if (isset($_GET['keywords'])) {
        $keywords = $_GET['keywords'];
        if (!empty($keywords)) {
            foreach ($keywords as $keyword) {
                fetchAndDisplayArticles($keyword);
            }
        } else {
            echo "<div class='hotspot_headlines_container'><div class='hotspot_headline'>Please select at least one keyword.</div></div>";
        }
    }

    function fetchAndDisplayArticles($keyword) {
        $apiKey = "a1770d7c67ea44a6b8e7d231a78d7db0";
        $url = "https://newsapi.org/v2/everything?q=" . urlencode($keyword) . "&apiKey=" . $apiKey;

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "GET",
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/json",
                "User-Agent: MyApp/1.0"
            ],
        ]);
        $response = curl_exec($curl);
        $err = curl_error($curl);
        curl_close($curl);
        $count=1;
        if ($err) {
            echo "<p>Error occurred while fetching data for keyword '$keyword': $err</p>";
        } else {
            $data = json_decode($response, true);

            if (isset($data['articles']) && is_array($data['articles'])) {
                // echo "<div class='hotspot_headlines_container'>";
                echo "<h2 class='latest_header'>$keyword News</h2>";
                echo "<div class='latest_wala_news'>";
                foreach ($data['articles'] as $article) {
                    if ($count >= 10) break; 
                    echo "<div class='container'>";
                    echo "<img src='" . htmlspecialchars($article['urlToImage']) . "' alt='Thumbnail' class=image_of_text><br><br>";
                    echo "<div class='title_of_text'>Title: " . htmlspecialchars($article['title']) . "</div><br>";
                    echo "<div class='description_of_text'>Description: " . htmlspecialchars($article['description']) . "</div><br>";
                    echo "<div class='url_of_text'>URL: <a href='" . htmlspecialchars($article['url']) . "'>" . htmlspecialchars($article['url']) . "</a></div><br>";
                    echo "</div><br><br>";
                    $count++;
                }
                echo "</div>";
                
            }
        }
    }
    ?>
    <div class='latest_wala_news'>


        
<?php
    //search Button 
    if (isset($_GET['keyword'])) {
        $keyword = htmlspecialchars($_GET['keyword']);
        if (!empty($keyword)) {
            searchAndDisplayArticles($keyword);
        } else {
            //echo "<div class='container error-message'>Keyword cannot be empty.</div>";
        }
    }

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
            echo "<h2 class='latest_header'>$keyword</h2>";
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


<div class="hotspot">
<?php
//top and hotspot
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
  $coun = 0;
    // echo $response;
    $data = json_decode($response, true);
    foreach ($data['articles'] as $article) {
      if ($coun >= 1) break; 
      if (isset($article['urlToImage'])) {
        echo "<div class='hotspot_image'>";
        echo "<h3 class='hotspot_img_header'>Top of day</h3>";
        echo "<img src='" . htmlspecialchars($article['urlToImage']) . "' alt='Thumbnail' class='hotspot_image_img'><br><br>";
        //echo "<div ><p class='hotspot_img_paragraph'>". htmlspecialchars($article['title']) . "</p></div>";
        echo "</div>";
    }

      $coun++;
  }

   
    if (isset($data['articles']) && is_array($data['articles'])) {
      
      $count = 1;


      echo "<div class='hotspot_headlines_container1'>";
      echo "<h3 calss='hotspot_headline_header' class='hotspot_img_header'>hotspot</h3>";
      foreach ($data['articles'] as $article) {
          if ($count >= 5) break; 
          echo "<div class='hotspot_headline'>";
          if (isset($article['title'])) {
              echo "<div class='hotspot_headline_1'><p>". $count .".) ". htmlspecialchars($article['title']) . "</p></div>";
          }
          if (isset($article['url'])) {
              echo "<div class='url_of_text'><a href='" . htmlspecialchars($article['url']) . "' target='_blank'>Read more</a></div>";
          }
          echo "</div>";
          $count++;
      }
      echo "</div>";
  } else {
      echo "<div class='hotspot_headlines_container'><div class='hotspot_headline'>No articles found or unexpected response format.</div></div>";
  }
}
?>
 </div>

  

    
    <h2 class="latest_header">Latest news</h2>

    <div class="latest_wala_news">

    <?php
    //latest news
$curl = curl_init();

curl_setopt_array($curl, [
	CURLOPT_URL => "https://biztoc.p.rapidapi.com/search?q=apple",
	CURLOPT_RETURNTRANSFER => true,
	CURLOPT_ENCODING => "",
	CURLOPT_MAXREDIRS => 10,
	CURLOPT_TIMEOUT => 30,
	CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
	CURLOPT_CUSTOMREQUEST => "GET",
	CURLOPT_HTTPHEADER => [
		"X-RapidAPI-Host: biztoc.p.rapidapi.com",
		"X-RapidAPI-Key: f5f364618emshf55af185328edccp189e4fjsna10fb674d29f"
	],
]);

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
	echo "cURL Error #:" . $err;
} else {
    $data = json_decode($response, true);
    $count=1;
    
    if ($data) {
        
        foreach ($data as $item) {
            if ($count >= 9) break; 
            $count++;
            echo "<div class='container'>";
            echo "<img src='" . $item['img']['s'] . "' alt='Thumbnail' class=image_of_text><br><br>";
            echo "<div class='tital_of_text'>". $item['title'] ."</div>";
            echo "<div class='body_of_text'>". $item['body'] ."</div>"; 
          
            echo "</div>";
        }
    } else {
        echo "No items found.";
    }
}
?>
    </div>
    
  </body>
</html>