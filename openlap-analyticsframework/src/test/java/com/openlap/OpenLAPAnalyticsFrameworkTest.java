//package com.openlap;
//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import com.google.gson.Gson;
//import com.mongodb.DBObject;
//import com.mongodb.util.JSON;
//import com.openlap.AnalyticsEngine.dto.LrsObjects;
//import com.openlap.AnalyticsEngine.dto.QueryParameters;
//import com.openlap.AnalyticsEngine.model.Statement;
//import com.openlap.AnalyticsMethods.services.AnalyticsMethodsService;
//import com.openlap.dataset.OpenLAPColumnConfigData;
//import com.openlap.dataset.OpenLAPColumnDataType;
//import com.openlap.dataset.OpenLAPDataColumn;
//import com.openlap.dataset.OpenLAPDataSet;
//import com.openlap.exceptions.OpenLAPDataColumnException;
//import io.swagger.models.auth.In;
//import org.apache.commons.lang3.StringUtils;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
//
//import java.sql.Array;
//import java.util.*;
//import java.util.stream.Collectors;
//
//
///**
// Created By Ao on 2022/10/30
// */
//
////@SpringBootTest(classes = OpenLAPAnalyticsFramework.class)
////@RunWith(SpringJUnit4ClassRunner.class)
//public class OpenLAPAnalyticsFrameworkTest {
//
//    public static void main(String[] args) throws Exception {
//        BCryptPasswordEncoder bCryptPasswordEncoder = new BCryptPasswordEncoder();
//        String sa0230 = bCryptPasswordEncoder.encode("sa0230");
//        boolean sa02301 = bCryptPasswordEncoder.matches("sa0230", "$2a$10$Tx4vUAyrU64XS187V7Wv7uzJkuQx2Cttk.jCpz6g6N.npEbD/PNWS");
//        System.out.println("sa02301 = " + sa02301);
//        System.out.println("sa0230 = " + sa0230);
//
//        int i1 = StringUtils.countMatches("1-2-3444-56", "-");
//
//        List<LrsObjects> lrsObjects = Arrays.asList(new LrsObjects("1", "324"), new LrsObjects("1", "34"));
//        lrsObjects.forEach(System.out::println);
//        List<Object> collect = lrsObjects.stream().map(LrsObjects::getStatement).collect(Collectors.toList());
//        System.out.println(collect);
//        Gson gson = new Gson();
//        ObjectMapper objectMapper = new ObjectMapper();
//        // Converting Java Object to Json
//        String temp = "{\n" +
//                "            \"agg\": [\n" +
//                "                {\n" +
//                "                    \"$match\": {\n" +
//                "                        \"statement.verb.id\": \"http://id.tincanapi.com/verb/viewed\"\n" +
//                "                    }\n" +
//                "                },\n" +
//                "                {\n" +
//                "                    \"$group\": {\n" +
//                "                        \"_id\": \"$statement.actor.account.name\",\n" +
//                "                        \"statement\": {\n" +
//                "                            \"$sum\": 1\n" +
//                "                        }\n" +
//                "                    }\n" +
//                "                }\n" +
//                "            ],\n" +
//                "            \"parametersToBeReturnedInResult\": {\n" +
//                "                \"view_total\": 1\n" +
//                "            },\n" +
//                "            \"statementDuration\": [\n" +
//                "                {\n" +
//                "                    \"statement.stored\": {\n" +
//                "                        \"$gte\": \"2022-07-07T12:10:11.221Z\"\n" +
//                "                    }\n" +
//                "                },\n" +
//                "                {\n" +
//                "                    \"statement.stored\": {\n" +
//                "                        \"$lte\": \"2022-07-14T12:10:11.221Z\"\n" +
//                "                    }\n" +
//                "                }\n" +
//                "            ]\n" +
//                "        }";
//        QueryParameters queryParameters = gson.fromJson(temp, QueryParameters.class);
//        HashMap<Object, Object> objectObjectHashMap = new HashMap<>();
//        OpenLAPColumnConfigData openLAPColumnConfigData = new OpenLAPColumnConfigData("thisisid", OpenLAPColumnDataType.Text, true, "haha", "heihei");
//        OpenLAPDataColumn openLAPDataColumn = new OpenLAPDataColumn("thisisid1", OpenLAPColumnDataType.Text, true, "haha", "heihei");
//        OpenLAPDataColumn openLAPDataColumn_2 = new OpenLAPDataColumn("thisisid1_2", OpenLAPColumnDataType.Text, true, "haha", "heihei");
//        OpenLAPDataColumn openLAPDataColumn2 = new OpenLAPDataColumn("thisisid1", OpenLAPColumnDataType.Text, true, "haha", "heihei");
//        OpenLAPDataColumn openLAPDataColumn2_2 = new OpenLAPDataColumn("thisisid1_2", OpenLAPColumnDataType.Text, true, "haha", "heihei");
//        openLAPDataColumn.setData(new ArrayList<Object>(Arrays.asList(1, 2, 4)));
//        openLAPDataColumn_2.setData(new ArrayList<Object>(Arrays.asList("sh", "sh2", "sh3")));
//        openLAPDataColumn2.setData(new ArrayList<Object>(Arrays.asList(4, 22, 14)));
//        openLAPDataColumn2_2.setData(new ArrayList<Object>(Arrays.asList("s11h", "sh22", "sh222s")));
//        OpenLAPDataSet openLAPDataSet = new OpenLAPDataSet();
//        OpenLAPDataSet openLAPDataSet2 = new OpenLAPDataSet();
//        openLAPDataSet.addOpenLAPDataColumn(openLAPDataColumn);
//        openLAPDataSet.addOpenLAPDataColumn(openLAPDataColumn_2);
//        openLAPDataSet2.addOpenLAPDataColumn(openLAPDataColumn2);
//        openLAPDataSet2.addOpenLAPDataColumn(openLAPDataColumn2_2);
//        objectObjectHashMap.put("1", openLAPDataSet);
//        objectObjectHashMap.put("2", openLAPDataSet2);
//        ArrayList arrayList = new ArrayList();
//        arrayList.add("attribute1");
//        arrayList.add("attribute2");
//        OpenLAPDataSet res = new OpenLAPDataSet();
//        for (int i = 0; i < objectObjectHashMap.keySet().size(); i++) {
//            Object key = Arrays.asList(objectObjectHashMap.keySet().toArray()).get(i);
//            OpenLAPDataSet keyObj = (OpenLAPDataSet) objectObjectHashMap.get(key);
//            OpenLAPDataColumn openLAPDataColumn11 = new OpenLAPDataColumn((String) arrayList.get(i), OpenLAPColumnDataType.Numeric, true, "haha", "heihei");
//            openLAPDataColumn11.setData((keyObj.getColumns().get("thisisid1").getData()));
//            res.addOpenLAPDataColumn(openLAPDataColumn11);
//        }
//
//        String statementDuration = gson.toJson(queryParameters.getStatementDuration());
//        String parametersToReceive = gson.toJson(queryParameters.getParametersToBeReturnedInResult());
//        // Converting Json to DBObject for MongoDB
//        System.out.println("queryParameters = " + queryParameters);
//        DBObject queryObject = (DBObject) JSON.parse(temp);
//        @SuppressWarnings("deprecation")
//        DBObject statementDurationObject = (DBObject) JSON.parse(statementDuration);
//        @SuppressWarnings("deprecation")
//        DBObject parametersToReceiveObject = (DBObject) JSON.parse(parametersToReceive);
//    }
//}
