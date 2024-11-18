const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',  // Входной файл
  output: {
    filename: 'build/bundle.js',  // Название скомпилированного файла
    path: path.resolve(__dirname, 'build'),  // Папка для выходных файлов
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Проверка на .js файлы
        exclude: /node_modules/, // Исключаем node_modules
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'], // Используем актуальный пресет
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        
        use: [
                {
                    loader: 'file-loader',
                    options: {
                        name: '[path][name].[ext]',
                    },
                },
            ],
        },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',  // Шаблон для HTML
    }),
  ],
  mode: 'development', // Режим разработки
  devServer: {
    static: path.resolve(__dirname), // Указываем папку для статичных файлов
    compress: true, // Включаем сжатие
    port: 9000, // Порт для сервера
    hot: true, // Включаем горячую перезагрузку
    open: true, // Автоматически открывает браузер
  },
};
