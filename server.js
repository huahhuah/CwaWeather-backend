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

// ======== 全台縣市 map（英文 → CWA 中文）===========
const cityMap = {
  taipei: "臺北市",
  newtaipei: "新北市",
  taoyuan: "桃園市",
  hsinchu: "新竹市",
  hsincounty: "新竹縣",
  miaoli: "苗栗縣",
  taichung: "臺中市",
  changhua: "彰化縣",
  nantou: "南投縣",
  yunlin: "雲林縣",
  chiayi: "嘉義市",
  chiayicounty: "嘉義縣",
  tainan: "臺南市",
  kaohsiung: "高雄市",
  pingtung: "屏東縣",
  ilan: "宜蘭縣",
  hualien: "花蓮縣",
  taitung: "臺東縣",
  keelung: "基隆市",
};

// ======== 主函式：抓任意縣市天氣 ===========
const getWeatherData = async (req, res) => {
  try {
    const cityCode = req.params.city.toLowerCase();
    const cityName = cityMap[cityCode];

    if (!cityName) {
      return res.status(400).json({
        success: false,
        message: `不支援的縣市代碼：${cityCode}`,
      });
    }

    if (!CWA_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "CWA_API_KEY 尚未設定",
      });
    }

    // 呼叫 CWA API
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

    // 組成前端格式
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
    console.error("取得天氣錯誤：", err.message);

    res.status(500).json({
      success: false,
      message: "伺服器取得天氣資料失敗",
    });
  }
};

// ======== 路由 ==========

// 全縣市通用 API
app.get("/api/weather/:city", getWeatherData);

app.get("/", (req, res) => {
  res.json({
    message: "CWA 天氣 API",
    example: "/api/weather/kaohsiung",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
