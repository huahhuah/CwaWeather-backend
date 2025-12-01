require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api";
const CWA_API_KEY = process.env.CWA_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 支援全台 22 縣市
const validCities = [
  "臺北市",
  "新北市",
  "桃園市",
  "臺中市",
  "臺南市",
  "高雄市",
  "基隆市",
  "新竹市",
  "新竹縣",
  "苗栗縣",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義市",
  "嘉義縣",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "臺東縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
];

app.get("/api/weather/:city", async (req, res) => {
  try {
    //  將URI編碼還原，例如 %E9%AB%98 → 高
    const cityName = decodeURIComponent(req.params.city);

    console.log("📥 前端請求城市：", req.params.city, "→ 解析後：", cityName);

    if (!validCities.includes(cityName)) {
      return res.status(400).json({
        success: false,
        message: `不支援的縣市：${cityName}`,
      });
    }

    if (!CWA_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "CWA_API_KEY 尚未設定",
      });
    }

    // ✔ 呼叫中央氣象署 API
    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          locationName: cityName,
        },
      }
    );

    const locationData = response.data.records.location[0];
    if (!locationData) {
      return res.status(404).json({
        success: false,
        message: `查無 ${cityName} 天氣資料`,
      });
    }

    const result = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: [],
    };

    const elements = locationData.weatherElement;
    const timeCount = elements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const f = {
        startTime: elements[0].time[i].startTime,
        endTime: elements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: "",
      };

      elements.forEach((e) => {
        const value = e.time[i].parameter;

        switch (e.elementName) {
          case "Wx":
            f.weather = value.parameterName;
            break;
          case "PoP":
            f.rain = value.parameterName + "%";
            break;
          case "MinT":
            f.minTemp = value.parameterName + "°C";
            break;
          case "MaxT":
            f.maxTemp = value.parameterName + "°C";
            break;
          case "CI":
            f.comfort = value.parameterName;
            break;
          case "WS":
            f.windSpeed = value.parameterName;
            break;
        }
      });

      result.forecasts.push(f);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("❌ 取得天氣錯誤：", err.message);
    res.status(500).json({
      success: false,
      message: "伺服器取得天氣資料失敗",
    });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "CWA 天氣 API（中文城市）" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
