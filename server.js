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

// ======== 英文 slug → 中文縣市 ========
const cityMap = {
  taipei: "臺北市",
  newtaipei: "新北市",
  taoyuan: "桃園市",
  taichung: "臺中市",
  tainan: "臺南市",
  kaohsiung: "高雄市",
  keelung: "基隆市",
  hsinchu: "新竹市",
  hsinchucounty: "新竹縣",
  miaoli: "苗栗縣",
  changhua: "彰化縣",
  nantou: "南投縣",
  yunlin: "雲林縣",
  chiayi: "嘉義市",
  chiayicounty: "嘉義縣",
  pingtung: "屏東縣",
  ilan: "宜蘭縣",
  hualien: "花蓮縣",
  taitung: "臺東縣",
  penghu: "澎湖縣",
  kinmen: "金門縣",
  lienchiang: "連江縣",
};

// ======== 主 API ========
app.get("/api/weather/:city", async (req, res) => {
  try {
    const slug = req.params.city.toLowerCase();
    const cityName = cityMap[slug];

    console.log("前端傳入 slug：", slug, "→ 轉換為：", cityName);

    if (!cityName) {
      return res.status(400).json({
        success: false,
        message: `不支援的城市代碼：${slug}`,
      });
    }

    if (!CWA_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "CWA_API_KEY 未設定",
      });
    }

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
        message: `查無 ${cityName} 資料`,
      });
    }

    const result = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: [],
    };

    const elements = locationData.weatherElement;
    const count = elements[0].time.length;

    for (let i = 0; i < count; i++) {
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
        const v = e.time[i].parameter;

        switch (e.elementName) {
          case "Wx":
            f.weather = v.parameterName;
            break;
          case "PoP":
            f.rain = v.parameterName + "%";
            break;
          case "MinT":
            f.minTemp = v.parameterName + "°C";
            break;
          case "MaxT":
            f.maxTemp = v.parameterName + "°C";
            break;
          case "CI":
            f.comfort = v.parameterName;
            break;
          case "WS":
            f.windSpeed = v.parameterName;
            break;
        }
      });

      result.forecasts.push(f);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("取得天氣失敗：", err.message);
    res.status(500).json({
      success: false,
      message: "伺服器錯誤",
    });
  }
});

app.get("/", (_, res) => {
  res.json({
    message: "CWA 天氣 API（英文 slug 版本）",
    usage: "/api/weather/kaohsiung",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
