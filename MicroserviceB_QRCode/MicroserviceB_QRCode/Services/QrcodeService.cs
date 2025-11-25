using Grpc.Core;
using QRCoder;

namespace MicroserviceB_QRCode.Services;

public class QrcodeService : QrCodeGenerator.QrCodeGeneratorBase
{
    public override Task<GenerateQrCodeReply> GenerateQrCode(GenerateQrCodeRequest request, ServerCallContext context)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(request.Text, QRCodeGenerator.ECCLevel.Q);

        var qrCode = new PngByteQRCode(qrCodeData);
        byte[] qrCodeBytes = qrCode.GetGraphic(20); 

        string base64Qr = Convert.ToBase64String(qrCodeBytes);

        return Task.FromResult(new GenerateQrCodeReply
        {
            QrCodeBase64 = base64Qr
        });
    }
}
