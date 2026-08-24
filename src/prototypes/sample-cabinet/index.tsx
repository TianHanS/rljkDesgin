/**
 * @name 存样柜
 */
import React, { useState, useRef, MouseEvent, WheelEvent, useMemo } from 'react';
import { message, Modal, Table, Select, Tag } from 'antd';
import { AlertOutlined, InfoCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import './style.css';

// ----------------- Data Parsing -----------------
const RAW_DATA = `
21 	 ASS001 	 2 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5800166 	 -82928 
23 	 ASS001 	 2 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5800166 	 324110 
39 	 ASS001 	 2 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5737666 	 222110 
40 	 ASS001 	 2 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5737666 	 19072 
41 	 ASS001 	 3 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5677103 	 -82928 
42 	 ASS001 	 3 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5677103 	 121072 
43 	 ASS001 	 3 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5677103 	 324110 
59 	 ASS001 	 3 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5614603 	 222110 
60 	 ASS001 	 3 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5614603 	 19072 
61 	 ASS001 	 4 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5552103 	 -82928 
62 	 ASS001 	 4 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5552103 	 121072 
63 	 ASS001 	 4 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5552103 	 324110 
71 	 ASS001 	 4 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5504789 	 1852124 
72 	 ASS001 	 4 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5498732 	 1653120 
73 	 ASS001 	 4 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5498732 	 1446158 
74 	 ASS001 	 4 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5498732 	 1243288 
75 	 ASS001 	 4 	 12 	 1 	 1 	 1 	 2023030711200161 	 EA9A7719 	 1 	 0 	 0 	 5493731 	 1043234 
76 	 ASS001 	 4 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5494731 	 837290 
77 	 ASS001 	 4 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5491721 	 624148 
78 	 ASS001 	 4 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5490717 	 426176 
79 	 ASS001 	 4 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5489603 	 222110 
80 	 ASS001 	 4 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5489603 	 19072 
81 	 ASS001 	 5 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5426177 	 -80658 
82 	 ASS001 	 5 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5426177 	 123072 
83 	 ASS001 	 5 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5430210 	 322070 
84 	 ASS001 	 5 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5430210 	 525070 
85 	 ASS001 	 5 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5433209 	 731070 
86 	 ASS001 	 5 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5433209 	 937108 
87 	 ASS001 	 5 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5433209 	 1140140 
88 	 ASS001 	 5 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5433209 	 1343070 
89 	 ASS001 	 5 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5434209 	 1547070 
90 	 ASS001 	 5 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5434209 	 1750070 
91 	 ASS001 	 5 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5371709 	 1852070 
92 	 ASS001 	 5 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5371709 	 1649070 
93 	 ASS001 	 5 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5370709 	 1445070 
94 	 ASS001 	 5 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5370709 	 1242140 
95 	 ASS001 	 5 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5370709 	 1039108 
96 	 ASS001 	 5 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5370709 	 833070 
97 	 ASS001 	 5 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5367710 	 627070 
98 	 ASS001 	 5 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5367710 	 424070 
99 	 ASS001 	 5 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5363677 	 225072 
100 	 ASS001 	 5 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5363677 	 21342 
101 	 ASS001 	 6 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5301177 	 -80658 
102 	 ASS001 	 6 	 3 	 1 	 1 	 1 	 2026000000000361 	 9AB87719 	 1 	 0 	 0 	 5301177 	 123072 
103 	 ASS001 	 6 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5305210 	 322070 
104 	 ASS001 	 6 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5305210 	 525070 
105 	 ASS001 	 6 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5308209 	 731070 
106 	 ASS001 	 6 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5308209 	 937108 
107 	 ASS001 	 6 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5308209 	 1140140 
108 	 ASS001 	 6 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5308209 	 1343070 
109 	 ASS001 	 6 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5309209 	 1547070 
110 	 ASS001 	 6 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5309209 	 1750070 
111 	 ASS001 	 6 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5246709 	 1852070 
112 	 ASS001 	 6 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5246709 	 1649070 
113 	 ASS001 	 6 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5245709 	 1445070 
114 	 ASS001 	 6 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5245709 	 1242140 
115 	 ASS001 	 6 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5245709 	 1039108 
116 	 ASS001 	 6 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5245709 	 833070 
117 	 ASS001 	 6 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5242710 	 627070 
118 	 ASS001 	 6 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5242710 	 424070 
119 	 ASS001 	 6 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5238677 	 225072 
120 	 ASS001 	 6 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5238677 	 21342 
121 	 ASS001 	 7 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5176177 	 -80658 
122 	 ASS001 	 7 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5176177 	 123072 
123 	 ASS001 	 7 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5180210 	 322070 
124 	 ASS001 	 7 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5180210 	 525070 
125 	 ASS001 	 7 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5183209 	 731070 
126 	 ASS001 	 7 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5183209 	 937108 
127 	 ASS001 	 7 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5183209 	 1140140 
128 	 ASS001 	 7 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5183209 	 1343070 
129 	 ASS001 	 7 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5184209 	 1547070 
130 	 ASS001 	 7 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5184209 	 1750070 
131 	 ASS001 	 7 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5121709 	 1852070 
132 	 ASS001 	 7 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5121709 	 1649070 
133 	 ASS001 	 7 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5120709 	 1445070 
134 	 ASS001 	 7 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5120709 	 1242140 
135 	 ASS001 	 7 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5120709 	 1039108 
136 	 ASS001 	 7 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5120709 	 833070 
137 	 ASS001 	 7 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5117710 	 627070 
138 	 ASS001 	 7 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5117710 	 424070 
139 	 ASS001 	 7 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5113677 	 225072 
140 	 ASS001 	 7 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5113677 	 21342 
141 	 ASS001 	 8 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5051177 	 -80658 
142 	 ASS001 	 8 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5051177 	 123072 
143 	 ASS001 	 8 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5055210 	 322070 
144 	 ASS001 	 8 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5055210 	 525072 
145 	 ASS001 	 8 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5058209 	 731070 
146 	 ASS001 	 8 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5058209 	 937108 
147 	 ASS001 	 8 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5058209 	 1140140 
148 	 ASS001 	 8 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5058209 	 1343070 
149 	 ASS001 	 8 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5059209 	 1547070 
150 	 ASS001 	 8 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 5059209 	 1750070 
151 	 ASS001 	 8 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4996709 	 1852070 
152 	 ASS001 	 8 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4996709 	 1649070 
153 	 ASS001 	 8 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4995709 	 1445070 
154 	 ASS001 	 8 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4995709 	 1242140 
155 	 ASS001 	 8 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4995709 	 1039108 
156 	 ASS001 	 8 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4995709 	 833070 
157 	 ASS001 	 8 	 8 	 1 	 1 	 1 	 2026000000000161 	 FAA67519 	 1 	 0 	 0 	 4992710 	 627070 
158 	 ASS001 	 8 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4992710 	 424070 
159 	 ASS001 	 8 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4988677 	 225072 
160 	 ASS001 	 8 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4988677 	 21342 
161 	 ASS001 	 9 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4930243 	 -80658 
162 	 ASS001 	 9 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4930243 	 123072 
163 	 ASS001 	 9 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4934247 	 322070 
164 	 ASS001 	 9 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4934247 	 525070 
165 	 ASS001 	 9 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4935247 	 731070 
166 	 ASS001 	 9 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4935247 	 937108 
167 	 ASS001 	 9 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4936247 	 1140140 
168 	 ASS001 	 9 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4936247 	 1343070 
169 	 ASS001 	 9 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4939253 	 1547070 
170 	 ASS001 	 9 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4939253 	 1750070 
171 	 ASS001 	 9 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4876753 	 1852070 
172 	 ASS001 	 9 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4876753 	 1649070 
173 	 ASS001 	 9 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4873747 	 1445070 
174 	 ASS001 	 9 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4873747 	 1242140 
175 	 ASS001 	 9 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4872747 	 1039108 
176 	 ASS001 	 9 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4872747 	 833070 
177 	 ASS001 	 9 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4871747 	 627070 
178 	 ASS001 	 9 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4871747 	 424070 
179 	 ASS001 	 9 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4867743 	 225072 
180 	 ASS001 	 9 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4867743 	 21342 
181 	 ASS001 	 10 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4805243 	 -80658 
182 	 ASS001 	 10 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4805243 	 123072 
183 	 ASS001 	 10 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4809247 	 322070 
184 	 ASS001 	 10 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4809247 	 525070 
185 	 ASS001 	 10 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4810247 	 731070 
186 	 ASS001 	 10 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4810247 	 937108 
187 	 ASS001 	 10 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4811247 	 1140140 
188 	 ASS001 	 10 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4811247 	 1343070 
189 	 ASS001 	 10 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4814253 	 1547070 
190 	 ASS001 	 10 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4814253 	 1750070 
191 	 ASS001 	 10 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4751753 	 1852070 
192 	 ASS001 	 10 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4751753 	 1649070 
193 	 ASS001 	 10 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4748747 	 1445070 
194 	 ASS001 	 10 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4748747 	 1242140 
195 	 ASS001 	 10 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4747747 	 1039108 
196 	 ASS001 	 10 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4747747 	 833070 
197 	 ASS001 	 10 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4746747 	 627070 
198 	 ASS001 	 10 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4746747 	 424070 
199 	 ASS001 	 10 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4742743 	 225072 
200 	 ASS001 	 10 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4742743 	 21342 
201 	 ASS001 	 11 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4680243 	 -80658 
202 	 ASS001 	 11 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4680243 	 123072 
203 	 ASS001 	 11 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4684247 	 322070 
204 	 ASS001 	 11 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4684247 	 525070 
205 	 ASS001 	 11 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4685247 	 731070 
206 	 ASS001 	 11 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4685247 	 937108 
207 	 ASS001 	 11 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4686247 	 1140140 
208 	 ASS001 	 11 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4686247 	 1343070 
209 	 ASS001 	 11 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4689253 	 1547070 
210 	 ASS001 	 11 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4689253 	 1750070 
211 	 ASS001 	 11 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4626753 	 1852070 
212 	 ASS001 	 11 	 18 	 1 	 1 	 1 	 2026000000000861 	 D6C01140 	 1 	 0 	 0 	 4626753 	 1649070 
213 	 ASS001 	 11 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4623747 	 1445070 
214 	 ASS001 	 11 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4623747 	 1242140 
215 	 ASS001 	 11 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4622747 	 1039108 
216 	 ASS001 	 11 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4622747 	 833070 
217 	 ASS001 	 11 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4621747 	 627070 
218 	 ASS001 	 11 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4621747 	 424070 
219 	 ASS001 	 11 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4617743 	 225072 
220 	 ASS001 	 11 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4617743 	 21342 
 221 	 ASS001 	 12 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4555243 	 -80658 
 222 	 ASS001 	 12 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4555243 	 123072 
 223 	 ASS001 	 12 	 5 	 1 	 1 	 1 	 2023031019821261 	 06FB1F40 	 1 	 0 	 0 	 4559247 	 322070 
 224 	 ASS001 	 12 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4559247 	 525070 
 225 	 ASS001 	 12 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4560247 	 731070 
 226 	 ASS001 	 12 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4560247 	 937108 
 227 	 ASS001 	 12 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4561247 	 1140140 
 228 	 ASS001 	 12 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4561247 	 1343070 
 229 	 ASS001 	 12 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4564253 	 1547070 
 230 	 ASS001 	 12 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4564253 	 1750070 
 231 	 ASS001 	 12 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4501753 	 1852070 
 232 	 ASS001 	 12 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4501753 	 1649070 
 233 	 ASS001 	 12 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4498747 	 1445070 
 234 	 ASS001 	 12 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4498747 	 1242140 
 235 	 ASS001 	 12 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4497747 	 1039108 
 236 	 ASS001 	 12 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4497747 	 833070 
 237 	 ASS001 	 12 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4496747 	 627070 
 238 	 ASS001 	 12 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4496747 	 424070 
 239 	 ASS001 	 12 	 4 	 1 	 1 	 1 	 2026031019821261 	 FAA57519 	 1 	 0 	 0 	 4492743 	 225072 
 240 	 ASS001 	 12 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4492743 	 21342 
 241 	 ASS001 	 13 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4430243 	 -80658 
 242 	 ASS001 	 13 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4430243 	 123072 
 243 	 ASS001 	 13 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4434247 	 322070 
 244 	 ASS001 	 13 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4434247 	 525070 
 245 	 ASS001 	 13 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4435247 	 731070 
 246 	 ASS001 	 13 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4435247 	 937108 
 247 	 ASS001 	 13 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4436247 	 1140140 
 248 	 ASS001 	 13 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4436247 	 1343070 
 249 	 ASS001 	 13 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4439253 	 1547070 
 250 	 ASS001 	 13 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4439253 	 1750070 
 251 	 ASS001 	 13 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4376753 	 1852070 
 252 	 ASS001 	 13 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4376753 	 1649070 
 253 	 ASS001 	 13 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4373747 	 1445070 
 254 	 ASS001 	 13 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4373747 	 1242140 
 255 	 ASS001 	 13 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4372747 	 1039108 
 256 	 ASS001 	 13 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4372747 	 833070 
 257 	 ASS001 	 13 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4371747 	 627070 
 258 	 ASS001 	 13 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4371747 	 424070 
 259 	 ASS001 	 13 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4367743 	 225072 
 260 	 ASS001 	 13 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4367743 	 21342 
 261 	 ASS001 	 14 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4306187 	 -84930 
 262 	 ASS001 	 14 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4306187 	 121100 
 263 	 ASS001 	 14 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4302179 	 322070 
 264 	 ASS001 	 14 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4302179 	 525072 
 265 	 ASS001 	 14 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4304181 	 732144 
 266 	 ASS001 	 14 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4304181 	 935098 
 267 	 ASS001 	 14 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4308194 	 1139070 
 268 	 ASS001 	 14 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4308194 	 1344070 
 269 	 ASS001 	 14 	 17 	 1 	 1 	 1 	 2023031000421261 	 F3C90D6E 	 1 	 0 	 0 	 4309194 	 1545070 
 270 	 ASS001 	 14 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4309194 	 1751070 
 271 	 ASS001 	 14 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4246694 	 1853070 
 272 	 ASS001 	 14 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4246694 	 1647070 
 273 	 ASS001 	 14 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4245694 	 1446070 
 274 	 ASS001 	 14 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4245694 	 1241070 
 275 	 ASS001 	 14 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4241681 	 1037098 
 276 	 ASS001 	 14 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4241681 	 834144 
 277 	 ASS001 	 14 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4239679 	 627072 
 278 	 ASS001 	 14 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4239679 	 424070 
 279 	 ASS001 	 14 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4243687 	 223100 
 280 	 ASS001 	 14 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4243687 	 17070 
 281 	 ASS001 	 15 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4181187 	 -84930 
 282 	 ASS001 	 15 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4181187 	 121100 
 283 	 ASS001 	 15 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4177179 	 322070 
 284 	 ASS001 	 15 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4177179 	 525072 
 285 	 ASS001 	 15 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4179181 	 732144 
 286 	 ASS001 	 15 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4179181 	 935098 
 287 	 ASS001 	 15 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4183194 	 1139070 
 288 	 ASS001 	 15 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4183194 	 1344070 
 289 	 ASS001 	 15 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4184194 	 1545070 
 290 	 ASS001 	 15 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4184194 	 1751070 
 291 	 ASS001 	 15 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4121694 	 1853070 
 292 	 ASS001 	 15 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4121694 	 1647070 
 293 	 ASS001 	 15 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4120694 	 1446070 
 294 	 ASS001 	 15 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4120694 	 1241070 
 295 	 ASS001 	 15 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4116681 	 1037098 
 296 	 ASS001 	 15 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4116681 	 834144 
 297 	 ASS001 	 15 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4114679 	 627072 
 298 	 ASS001 	 15 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4114679 	 424070 
 299 	 ASS001 	 15 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4118687 	 223100 
 300 	 ASS001 	 15 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4118687 	 17070 
 301 	 ASS001 	 16 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4056187 	 -84930 
 302 	 ASS001 	 16 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4056187 	 121100 
 303 	 ASS001 	 16 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4052179 	 322070 
 304 	 ASS001 	 16 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4052179 	 525072 
 305 	 ASS001 	 16 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4054181 	 732144 
 306 	 ASS001 	 16 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4054181 	 935098 
 307 	 ASS001 	 16 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4058194 	 1139070 
 308 	 ASS001 	 16 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4058194 	 1344070 
 309 	 ASS001 	 16 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4059194 	 1545070 
 310 	 ASS001 	 16 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 4059194 	 1751070 
 311 	 ASS001 	 16 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3996694 	 1853070 
 312 	 ASS001 	 16 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3996694 	 1647070 
 313 	 ASS001 	 16 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3995694 	 1446070 
 314 	 ASS001 	 16 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3995694 	 1241070 
 315 	 ASS001 	 16 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3991681 	 1037098 
 316 	 ASS001 	 16 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3991681 	 834144 
 317 	 ASS001 	 16 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3989679 	 627072 
 318 	 ASS001 	 16 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3989679 	 424070 
 319 	 ASS001 	 16 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3993687 	 223100 
 320 	 ASS001 	 16 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3993687 	 17070 
 321 	 ASS001 	 17 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3931187 	 -84930 
 322 	 ASS001 	 17 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3931187 	 121100 
 323 	 ASS001 	 17 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3927179 	 322070 
 324 	 ASS001 	 17 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3927179 	 525072 
 325 	 ASS001 	 17 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3929181 	 732144 
 326 	 ASS001 	 17 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3929181 	 935098 
 327 	 ASS001 	 17 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3933194 	 1139070 
 328 	 ASS001 	 17 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3933194 	 1344070 
 329 	 ASS001 	 17 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3934194 	 1545070 
 330 	 ASS001 	 17 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3934194 	 1751070 
 331 	 ASS001 	 17 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3871694 	 1853070 
 332 	 ASS001 	 17 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3871694 	 1647070 
 333 	 ASS001 	 17 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3870694 	 1446070 
 334 	 ASS001 	 17 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3870694 	 1241070 
 335 	 ASS001 	 17 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3866681 	 1037098 
 336 	 ASS001 	 17 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3866681 	 834144 
 337 	 ASS001 	 17 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3864679 	 627072 
 338 	 ASS001 	 17 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3864679 	 424070 
 339 	 ASS001 	 17 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3868687 	 223100 
 340 	 ASS001 	 17 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3868687 	 17070 
 341 	 ASS001 	 18 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3807192 	 -84930 
 342 	 ASS001 	 18 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3807192 	 121100 
 343 	 ASS001 	 18 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3808200 	 322070 
 344 	 ASS001 	 18 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3808200 	 525072 
 345 	 ASS001 	 18 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3806200 	 732144 
 346 	 ASS001 	 18 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3806200 	 935098 
 347 	 ASS001 	 18 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3808202 	 1139070 
 348 	 ASS001 	 18 	 15 	 1 	 1 	 1 	 2026000000000261 	 1A8F7519 	 1 	 0 	 0 	 3808202 	 1344070 
 349 	 ASS001 	 18 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3808202 	 1545070 
 350 	 ASS001 	 18 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3808202 	 1751070 
 351 	 ASS001 	 18 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3745702 	 1853070 
 352 	 ASS001 	 18 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3745702 1647070 
 353 	 ASS001 	 18 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3745702 	 1446070 
 354 	 ASS001 	 18 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3745702 	 1241070 
 355 	 ASS001 	 18 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3743700 	 1037098 
 356 	 ASS001 	 18 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3743700 	 834144 
 357 	 ASS001 	 18 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3745700 	 627072 
 358 	 ASS001 	 18 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3745700 	 424070 
 359 	 ASS001 	 18 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3744692 	 223100 
 360 	 ASS001 	 18 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3744692 	 17070 
 361 	 ASS001 	 19 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3682192 	 -84930 
 362 	 ASS001 	 19 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3682192 	 121100 
 363 	 ASS001 	 19 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3683200 	 322070 
 364 	 ASS001 	 19 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3683200 	 525072 
 365 	 ASS001 	 19 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3681200 	 732144 
 366 	 ASS001 	 19 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3681200 	 935098 
 367 	 ASS001 	 19 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3683202 	 1139070 
 368 	 ASS001 	 19 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3683202 	 1344070 
 369 	 ASS001 	 19 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3683202 	 1545070 
 370 	 ASS001 	 19 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3683202 	 1751070 
 371 	 ASS001 	 19 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3620702 	 1853070 
 372 	 ASS001 	 19 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3620702 	 1647070 
 373 	 ASS001 	 19 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3620702 	 1446070 
 374 	 ASS001 	 19 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3620702 	 1241070 
 375 	 ASS001 	 19 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3618700 	 1037098 
 376 	 ASS001 	 19 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3618700 	 834144 
 377 	 ASS001 	 19 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3620700 	 627072 
 378 	 ASS001 	 19 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3620700 	 424070 
 379 	 ASS001 	 19 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3619692 	 223100 
 380 	 ASS001 	 19 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3619692 	 17070 
 381 	 ASS001 	 20 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3557192 	 -84930 
 382 	 ASS001 	 20 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3557192 	 121100 
 383 	 ASS001 	 20 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3558200 	 322070 
 384 	 ASS001 	 20 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3558200 	 525072 
 385 	 ASS001 	 20 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3556200 	 732144 
 386 	 ASS001 	 20 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3556200 	 935098 
 387 	 ASS001 	 20 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3558202 	 1139070 
 388 	 ASS001 	 20 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3558202 	 1344070 
 389 	 ASS001 	 20 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3558202 	 1545070 
 390 	 ASS001 	 20 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3558202 	 1751070 
 391 	 ASS001 	 20 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3495702 	 1853070 
 392 	 ASS001 	 20 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3495702 	 1647070 
 393 	 ASS001 	 20 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3495702 	 1446070 
 394 	 ASS001 	 20 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3495702 	 1241070 
 395 	 ASS001 	 20 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3493700 	 1037098 
 396 	 ASS001 	 20 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3493700 	 834144 
 397 	 ASS001 	 20 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3495700 	 627072 
 398 	 ASS001 	 20 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3495700 	 424070 
 399 	 ASS001 	 20 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3494692 	 223100 
 400 	 ASS001 	 20 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3494692 	 17070 
 401 	 ASS001 	 21 	 1 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3432192 	 -84930 
 402 	 ASS001 	 21 	 3 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3432192 	 121100 
 403 	 ASS001 	 21 	 5 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3433200 	 322070 
 404 	 ASS001 	 21 	 7 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3433200 	 525072 
 405 	 ASS001 	 21 	 9 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3431200 	 732144 
 406 	 ASS001 	 21 	 11 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3431200 	 935098 
 407 	 ASS001 	 21 	 13 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3433202 	 1139070 
 408 	 ASS001 	 21 	 15 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3433202 	 1344070 
 409 	 ASS001 	 21 	 17 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3433202 	 1545070 
 410 	 ASS001 	 21 	 19 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3433202 	 1751070 
 411 	 ASS001 	 21 	 20 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3370702 	 1853070 
 412 	 ASS001 	 21 	 18 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3370702 	 1647070 
 413 	 ASS001 	 21 	 16 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3370702 	 1446070 
 414 	 ASS001 	 21 	 14 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3370702 	 1241070 
 415 	 ASS001 	 21 	 12 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3368700 	 1037098 
 416 	 ASS001 	 21 	 10 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3368700 	 834144 
 417 	 ASS001 	 21 	 8 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3370700 	 627072 
 418 	 ASS001 	 21 	 6 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3370700 	 424070 
 419 	 ASS001 	 21 	 4 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3369692 	 223100 
 420 	 ASS001 	 21 	 2 	 1 	 1 	 0 	 NULL 	 NULL 	 1 	 0 	 0 	 3369692 	 17070 
`.trim();

const parseCabinetData = (raw: string) => {
  const lines = raw.split('\n');
  const cells: any[] = [];
  
  lines.forEach(line => {
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 14) return;

    const [id, device, col, layer, depth, z, hasBottle, sampleCode, chipId, big, mid, small, x, y] = parts;
    
    cells.push({
      id,
      device,
      col: parseInt(col),
      layer: parseInt(layer),
      depth: parseInt(depth),
      z: parseInt(z),
      status: hasBottle === '1' ? 1 : 0,
      sampleCode: sampleCode === 'NULL' ? '' : sampleCode,
      chipId: chipId === 'NULL' ? '' : chipId,
      isBig: big === '1',
      isMid: mid === '1',
      isSmall: small === '1',
      x: parseInt(x),
      y: parseInt(y),
      coalType: hasBottle === '1' ? '全水样' : '',
      storeTime: hasBottle === '1' ? '2026-03-21 10:55:22' : '',
    });
  });

  // Normalize coordinates for display
  if (cells.length === 0) return { cells: [], bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 } };

  const minX = Math.min(...cells.map(c => c.x));
  const maxX = Math.max(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  const maxY = Math.max(...cells.map(c => c.y));

  return { cells, bounds: { minX, maxX, minY, maxY } };
};

const cabinetData = parseCabinetData(RAW_DATA);

const generateMockRecords = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    key: i,
    index: i + 1,
    sampleCode: `B${798 + i}BE326905E`,
    coalType: ['全水样', '分析样', '备用样'][Math.floor(Math.random() * 3)],
    opType: ['存样', '取样', '销样'][Math.floor(Math.random() * 3)],
    time: `2026-03-21 10:55:${(59 - i).toString().padStart(2, '0')}`,
  }));
};

const allRecords = generateMockRecords();

// ----------------- Components -----------------

const Component = () => {
  const MANUFACTURER_KAIYUAN = '2';
  const [manufacturer, setManufacturer] = useState(MANUFACTURER_KAIYUAN);
  const [displayTab, setDisplayTab] = useState('存样信息');
  const [messageApi, contextHolder] = message.useMessage();
  const [opFilter, setOpFilter] = useState('全部');

  // Zoom and Drag state
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    setScale((prev) => Math.min(Math.max(0.1, prev + delta), 5));
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCellClick = (cell: any) => {
    if (cell.status === 0) {
      messageApi.warning('此单元格未存样！');
    } else if (cell.status === -1) {
      messageApi.error('此格已禁用！');
    } else {
      setSelectedCell(cell);
      setIsModalVisible(true);
    }
  };

  const filteredRecords = allRecords.filter(r => opFilter === '全部' || r.opType === opFilter);

  // Layout calculations
  const { cells, bounds } = cabinetData;
  const panelWidth = 800;
  const panelHeight = 400;

  const renderPanel = (z: number) => {
    const zCells = cells.filter(c => c.z === z);
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;

    return (
      <div className="flex flex-col items-center">
        <div className="text-cyan-400 text-sm mb-2 font-bold tracking-widest opacity-60">
          {z === 1 ? '上层/左侧' : '下层/右侧'} 存样区 (Z:{z})
        </div>
        <div 
          className="relative border border-cyan-700/30 rounded-lg bg-[#102038]/40 shadow-inner overflow-hidden"
          style={{ width: panelWidth, height: panelHeight }}
        >
          {zCells.map((cell) => {
            // Normalize X to [0, panelWidth], Y to [0, panelHeight]
            // Note: coordinates might need flipping depending on real world Y direction
            const left = ((cell.x - bounds.minX) / rangeX) * (panelWidth - 20) + 10;
            const top = (1 - (cell.y - bounds.minY) / rangeY) * (panelHeight - 20) + 10;

            return (
              <div
                key={cell.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCellClick(cell);
                }}
                className={`absolute w-3 h-3 rounded-sm cursor-pointer transition-all hover:scale-150 hover:z-10 shadow-[0_0_5px_rgba(0,0,0,0.5)] ${
                  cell.status === 1 ? 'bg-[#10b981]' : 
                  cell.status === 2 ? 'bg-[#ef4444]' : 
                  cell.status === -1 ? 'bg-[#374151]' : 
                  'bg-[#1a4a5a]'
                }`}
                style={{ left, top }}
                title={`位置:${cell.id} 坐标:(${cell.x}, ${cell.y})`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#0b1426] text-white overflow-hidden font-sans select-none">
      {contextHolder}

      {/* Header */}
      <header className="h-16 border-b border-cyan-900/50 flex items-center justify-between px-6 bg-[#0d1b2a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            国
          </div>
          <h1 className="text-xl font-bold tracking-wider text-cyan-50">燃料质检集控中心</h1>
        </div>
        <nav className="flex gap-1 h-full">
          {['主界面', '采样机', '合并批次', '自动制样', '气动传输', '存样柜', '自动化验', '视频门禁', '集中控制', '告警'].map((tab) => (
            <div
              key={tab}
              className={`px-4 h-full flex items-center cursor-pointer text-sm font-medium border-b-2 transition-colors ${
                tab === '存样柜'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-900/20'
                  : 'border-transparent text-gray-400 hover:text-cyan-200'
              }`}
            >
              {tab}
            </div>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Panel: Cabinet Area */}
        <section className="flex-[7] flex flex-col gap-4 min-w-0">
          {/* Top Controls */}
          <div className="flex items-center gap-4 shrink-0">
            <Select
              value={manufacturer}
              onChange={setManufacturer}
              className="w-40 custom-dark-select"
              popupClassName="custom-dark-select-popup"
              options={[
                { value: '1', label: '全自动存样柜 (其它)' },
                { value: '2', label: '全自动存样柜 (开元)' },
              ]}
            />
            <div className="flex items-center bg-[#152740] rounded-md p-1 border border-cyan-900/30">
              <span className="px-3 text-sm text-gray-400">显示类型</span>
              <div className="flex gap-1 ml-2">
                {['存样信息', '单元格编码', '实时监测']
                  .map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDisplayTab(tab)}
                      className={`px-4 py-1 rounded text-sm transition-colors ${
                        displayTab === tab
                          ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                          : 'text-gray-400 hover:bg-[#1e3a5f]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          <div
            ref={containerRef}
            className="flex-1 bg-[#0a1526] rounded-lg border border-cyan-800/40 relative overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="absolute transform-gpu transition-transform duration-75 origin-center"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px' // Small gap between panels
              }}
            >
              {renderPanel(1)}
              {renderPanel(2)}
            </div>
            
            <div className="absolute bottom-4 right-4 text-xs text-cyan-600/60 pointer-events-none bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              滚轮缩放 / 长按拖拽平移 | 物理坐标渲染 (上下布局)
            </div>
          </div>
        </section>

        {/* Right Panel: Records & Alarms */}
        <section className="flex-[3] flex flex-col gap-4 min-w-0">
          <div className="flex-1 bg-[#101c30] border border-cyan-900/50 rounded-lg flex flex-col overflow-hidden">
            <div className="h-10 px-4 flex items-center justify-between border-b border-cyan-900/50 bg-[#142642]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-400 rounded-full"></div>
                <span className="font-bold text-cyan-100">样瓶记录</span>
              </div>
              <Select
                value={opFilter}
                onChange={setOpFilter}
                className="w-24 custom-dark-select-small"
                popupClassName="custom-dark-select-popup"
                options={[
                  { value: '全部', label: '全部' },
                  { value: '存样', label: '存样' },
                  { value: '取样', label: '取样' },
                  { value: '销样', label: '销样' },
                ]}
              />
            </div>
            <div className="flex-1 p-2 overflow-auto custom-dark-table-container">
              <Table
                dataSource={filteredRecords}
                pagination={false}
                size="small"
                rowClassName="hover:bg-[#1a3252] transition-colors"
                className="custom-dark-table"
                columns={[
                  { title: '序号', dataIndex: 'index', key: 'index', width: 50, align: 'center', className: 'text-gray-500' },
                  { title: '样瓶编码', dataIndex: 'sampleCode', key: 'sampleCode', className: 'text-gray-300' },
                  { title: '煤样类型', dataIndex: 'coalType', key: 'coalType', className: 'text-gray-400' },
                  { title: '操作类型', dataIndex: 'opType', key: 'opType', width: 80, align: 'center', render: (text) => (
                    <Tag color={text === '存样' ? 'blue' : text === '取样' ? 'green' : 'orange'} className="m-0 border-0 bg-opacity-20">
                      {text}
                    </Tag>
                  )},
                  { title: '操作时间', dataIndex: 'time', key: 'time', className: 'text-gray-500 text-xs' },
                ]}
              />
            </div>
          </div>

          <div className="h-48 bg-[#101c30] border border-cyan-900/50 rounded-lg flex flex-col overflow-hidden relative">
            <div className="h-8 bg-red-900/80 flex items-center px-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]"></div>
              <span className="font-bold text-white relative z-10 flex items-center gap-2">
                <AlertOutlined /> 实时报警信息
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
              <ExclamationCircleOutlined className="text-3xl text-gray-600" />
              <span>暂无数据</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-10 bg-[#0d1a2d] border-t border-cyan-900/50 flex items-center justify-between px-6 text-sm text-cyan-600 shrink-0">
        <div className="flex gap-6">
          <span>今日存样：<strong className="text-cyan-300">11</strong></span>
        </div>
        <div className="flex gap-6">
          <span>全水件：<strong className="text-cyan-300">289</strong></span>
          <span>存样件：<strong className="text-cyan-300">916</strong></span>
          <span>分析件：<strong className="text-cyan-300">37</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <InfoCircleOutlined />
          <span>警示标识</span>
        </div>
      </footer>

      {/* Cell Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-cyan-400 border-b border-cyan-900/50 pb-2">
            <div className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-base font-bold tracking-widest">样品详细信息</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={380}
        className="custom-dark-modal"
        closeIcon={<span className="text-gray-400 hover:text-white">✕</span>}
      >
        {selectedCell && (
          <div className="py-2">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">单元格编码</span>
                <span className="text-cyan-300 font-mono bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-900/30">{selectedCell.id}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">样瓶编码 (二级码)</span>
                <span className="text-white font-medium">{selectedCell.sampleCode || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">物理芯片 ID</span>
                <span className="text-white font-mono opacity-80">{selectedCell.chipId || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">物理坐标 (X, Y)</span>
                <div className="flex items-center gap-2">
                  <Tag className="m-0 bg-cyan-900/20 border-cyan-800/50 text-cyan-400 text-xs">X: {selectedCell.x}</Tag>
                  <Tag className="m-0 bg-cyan-900/20 border-cyan-800/50 text-cyan-400 text-xs">Y: {selectedCell.y}</Tag>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">瓶子规格</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedCell.isBig ? 'bg-orange-500' : selectedCell.isMid ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <span className="text-gray-200">{selectedCell.isBig ? '大瓶' : selectedCell.isMid ? '中瓶' : '小瓶'}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">煤样类型</span>
                <span className="text-cyan-100">{selectedCell.coalType || '空置中'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">存样记录时间</span>
                <span className="text-gray-400 italic">{selectedCell.storeTime || '无记录'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Component;
