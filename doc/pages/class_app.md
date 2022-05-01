> [Langley Document](../index.md) : [API Reference](./api.md) : App

# App class
## Description
App 类描述了一个服务端应用对象， 服务端应用对象将开启并监听 HTTP 端口，提供接口路由，处理 HTTP 的一切事务。
## Constructor
App 类的构造方法原型如下：
```js
function App(cfg);
```
其中，cfg 是一个对象，包含了对 App 的配置参数，详见下表：

| Key | Type | Description |
|-----|------|-------------|
|root|string|项目根目录，之后一切关于路径的描述都以此为根。|
|addr|string|监听地址。|
|port|int|监听端口。|
|app|string|应用目录，及应用代码所在目录，Langley 将自动扫描并读取其下所有 js 文件作为应用模块。|
|modules|Array(string)|模块列表，如果想要加载不在应用目录中的模块，可以在这里指定其相对于 root 的路径。|
|static|string|静态资源路径，该路径下静态资源将被映射到 / |
|template|string|模板文件路径，如果指定本参数，app 将会建立一个 Template 对象用于渲染模板 |
|errpages|string|HTTP错误页面路径 |
|data|Any|用户数据，可以通过 app.data 访问|
|mod|Array(Object)|自定义模块，可以通过 app.modules 访问|
|init|async function|初始化函数， App.run 时，所有模块的 init 方法执行结束后执行。|
|hooks|Object|钩子（前/后处理器）|


## Methods
| Method | Description |
|--------|-------------|
| [run](./class_app_run.md) | 运行应用 |
| [registerPreprocessor](./class_app_registerpreprocessor.md)|注册预处理器|
| [registerPostprocessor](./class_app_registerpostprocessor.md)|注册后处理器|

## Property
| Property | Type | Description |
|----------|------|-------------|
| modules | Object | 包含所有被 Langley 加载的模块，Key 为模块名 |
| config | Object | 构造 App 时传入的配置对象 |
| data | Any | 构造 App 时传入配置对象的 data 成员 |
| timestamp | integer | 当前 Unix 时间戳 |
| Template | Object | 如果在 cfg 中制定了 template 路径，app 初始化时将会自动以此为根目录创建一个 [Template](./class_template.md)，此后可使用该对象来进行模板渲染 |

## 关于模块加载
- 使用 Langley 时，应用代码可以写在`模块`里面。一个 js 文件描述一个`模块`。
- 可以在 App 构造参数中的 modules 数组中直接指定模块 js 文件路径来告知 Langley 应当加载哪些 js 文件作为模块。
- 也可以将 App 构造参数中的 app 字符串设置为模块 js 文件所在的路径，Langley 将会自动扫描并加载该路径下的所有 js 文件。

## 访问被加载的模块
- 可以通过 App.modules[`模块名`] 来访问被加载的模块。
- 模块中，如果导出了 name 值，那该 name 值将被作为`模块名`，否则，模块路径将被作为`模块名`。

## 模块初始化
- 如果在模块中导出 init 函数，那么当所有模块都被加载后，Langley 会自动调用所有模块的 init 函数（如果有）。

## 定义 HTTP 接口路由
模块中以斜杠（`/`）开头的导出对象将会被尝试加入 HTTP 接口路由，定义 HTTP 接口路由时，应当包含以下成员：
| Key | Type | Description |
|-----|------|-------------|
| method | Array(string) | 允许的 HTTP 请求方法，支持 'GET' 和 'POST' |
| preprocessingChain | Array(string/function) | 预处理链 |
| postprocessingChain | Array(string/function) | 后处理链 |
| proc | function | 请求处理函数 |

**`method`** （可选）

用于指定允许的 HTTP 请求方法，可以设置为 [`'GET'`]、[`'POST'`] 或 [`'GET'`, `'POST'`]。如果传入的请求方法不在 method 所指定的范围内，Langley 将直接返回 400。

**`preprocessingChain`** （可选）

用于指定预处理链，当传入请求时，会首先按顺序执行这个链条，然后才会接收 POST 数据。参考 [预处理链](./class_app_preprocessing.md)

**`postprocessingChain`** （可选）

用于指定后处理链，请求处理完后，按顺序执行所有后处理函数。参考 [后处理链](./class_app_postprocessing.md)

**`proc`**

用于指定请求处理函数，在 POST 数据接收完毕后，Langley 会调用该方法来处理请求。

proc 函数原型如下：
``` js
function proc(req, rsp, app){}
```

`在一次请求中，传入所有前后处理器和 proc 的 req 和 rsp 对象是相同的，因此可以利用这两个对象来在前后处理器和 proc 间同步数据`

**`简单模式`**

如果你在模块中导出一个名字以 `/` 开头的函数，Langley 会将其视为 HTTP 接口路由的 proc 函数，并留空 method 和 pre 来定义 HTTP 接口路由。因此，你可以通过这种方式来简单地定义 HTTP 接口路由。 

**`一份完整的模块代码示例`**
``` js
// xxx.js
module.exports = {
    // 申明模块名，此后可以通过这个名字来从 app.modules 中索引本模块
    name : 'Test Module',   

    // 定义模块初始化代码
    init : (app)=>{
        // ... DO SOME INITIALIZING ....
    },

    // 简单模式定义 HTTP 接口
    '/a' : (req, rsp)=>{ return 'Called a'; },

    // 下面的代码也定义了一个 HTTP 接口，这种定义方式等价于上面对 /a 的定义
    '/b' : {
        proc : (req, rsp)=>{ return 'Called b'; },
    },

    // 完整定义一个 HTTP 接口
    '/c' : {
        method : ['POST'],
        preprocessingChain : ['aa', 'bb', 
            (req, rsp, app, route)=>{
                // ... DO SOME CHECK HERE ...
            }
        ],
        postprocessingChain : ['cc','dd',
            (req, rsp, app, route, ret)=>{
                // ... DO SOME PROCESS HERE ...
            }
        ]
        proc : (req, rsp)=>{ return 'Called c'; }
    }
}
```