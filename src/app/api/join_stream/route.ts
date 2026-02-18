import { Controller, JoinRoomParams } from "@/lib/controller";

export async function POST(req: Request) {
  const controller = new Controller();

  try {
    const body = (await req.json()) as JoinRoomParams;
    const response = await controller.joinRoom(body);
    return Response.json(response);
  } catch (err) {
    if (err instanceof Error) {
      return new Response(err.message, { status: 500 });
    }
    return new Response(null, { status: 500 });
  }
}
