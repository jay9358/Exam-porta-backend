class Response{
    constructor(sucess,statusCode, message, data){
        this.sucess=sucess
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}
exports.Response;